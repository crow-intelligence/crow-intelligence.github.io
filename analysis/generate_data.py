"""Generate all analysis data for the chronowords dashboard.

This script trains models on presidential speeches corpus,
computes semantic shifts, topic models, nearest neighbors,
and outputs a single JSON file for the dashboard.
"""

import json
import re
from pathlib import Path

import numpy as np
from nltk.collocations import BigramAssocMeasures
from nltk.collocations import BigramCollocationFinder
from sklearn.decomposition import NMF
from sklearn.feature_extraction.text import TfidfVectorizer

from chronowords.algebra.svd import SVDAlgebra
from chronowords.alignment.procrustes import ProcrustesAligner


DATA_DIR = Path(__file__).parent.parent / "data" / "corpus"
OUTPUT = Path(__file__).parent / "dashboard_data.json"

PERIODS = [
    "1775-1799", "1800-1824", "1825-1849", "1850-1874", "1875-1899",
    "1900-1924", "1925-1949", "1950-1974", "1975-1999", "2000-2024",
]

TARGET_WORDS = [
    "freedom", "democracy", "government", "power", "war", "peace",
    "america", "union", "state", "constitution", "rights", "justice",
    "law", "nation", "security", "economy",
]

# Words to filter from nearest neighbors
STOPWORDS = {
    "the", "and", "for", "that", "this", "with", "not", "but", "from",
    "have", "has", "had", "been", "was", "were", "are", "will", "would",
    "could", "should", "may", "might", "shall", "can", "did", "does",
    "don", "doesn", "didn", "won", "wouldn", "couldn", "shouldn",
    "isn", "aren", "wasn", "weren", "hasn", "haven", "hadn",
    "its", "our", "their", "your", "his", "her", "who", "whom",
    "which", "what", "where", "when", "how", "why", "than", "then",
    "them", "they", "she", "him", "all", "any", "each", "every",
    "also", "just", "only", "very", "much", "more", "most", "many",
    "such", "some", "other", "another", "own", "too", "nor", "yet",
    "both", "either", "neither", "here", "there", "now", "still",
    "about", "above", "after", "again", "before", "below", "between",
    "during", "into", "over", "under", "until", "upon", "while",
}


def _is_content_word(word):
    """Return True if word is a meaningful content word."""
    if word in STOPWORDS:
        return False
    if len(word) < 3:
        return False
    # Filter contractions and fragments
    if "'" in word or "'" in word:
        return False
    # Filter pure numbers
    if re.match(r'^\d+$', word):
        return False
    return True


def train_models():
    """Train fresh embedding models for each period."""
    models = {}
    for period in PERIODS:
        corpus_file = DATA_DIR / f"speeches_{period}_lemmatized.txt"
        if not corpus_file.exists():
            print(f"Skipping {period}: no corpus file")
            continue

        print(f"Training {period}...")

        def read_corpus(f=corpus_file):
            with open(f, encoding="utf-8") as fh:
                for line in fh:
                    if line.strip():
                        yield line.strip().lower()

        model = SVDAlgebra(
            n_components=100,
            window_size=5,
            min_word_length=3,
            cms_width=1_000_000,
            cms_depth=5,
        )
        model.train(read_corpus())
        models[period] = model
    return models


def compute_consecutive_shifts(models):
    """Compute period-to-period semantic shifts for target words."""
    periods = sorted(models.keys())
    rows = []
    alignment_stats = []

    for i in range(len(periods) - 1):
        p1, p2 = periods[i], periods[i + 1]
        m1, m2 = models[p1], models[p2]

        aligner = ProcrustesAligner()
        metrics = aligner.fit(m1.embeddings, m2.embeddings, m1.vocabulary, m2.vocabulary)

        alignment_stats.append({
            "from": p1, "to": p2,
            "aligned_words": metrics.num_aligned_words,
            "avg_similarity": round(float(metrics.average_cosine_similarity), 4),
        })

        for word in TARGET_WORDS:
            sim = aligner.get_word_similarity(word, m1.embeddings, m2.embeddings)
            if sim is not None:
                rows.append({
                    "from": p1, "to": p2,
                    "word": word,
                    "shift": round(float(1 - sim), 4),
                    "year": int(p1.split("-")[0]),
                })

    return rows, alignment_stats


def compute_cumulative_shifts(models):
    """Compute cumulative shifts from baseline (first period)."""
    periods = sorted(models.keys())
    base = models[periods[0]]
    rows = []

    for p in periods[1:]:
        current = models[p]
        aligner = ProcrustesAligner()
        aligner.fit(base.embeddings, current.embeddings, base.vocabulary, current.vocabulary)

        for word in TARGET_WORDS:
            sim = aligner.get_word_similarity(word, base.embeddings, current.embeddings)
            if sim is not None:
                rows.append({
                    "period": p,
                    "word": word,
                    "shift": round(float(1 - sim), 4),
                    "year": int(p.split("-")[0]),
                })

    return rows


def compute_nearest_neighbors(models, words=None, top_n=8):
    """Get nearest neighbors for target words, filtering function words."""
    if words is None:
        words = ["freedom", "democracy", "government", "war", "peace", "power"]
    result = {}
    for period, model in sorted(models.items()):
        period_data = {}
        for word in words:
            try:
                # Request more than needed so we can filter
                raw_neighbors = model.most_similar(word, n=top_n * 3)
                filtered = []
                for n in raw_neighbors:
                    if _is_content_word(n.word) and n.word != word:
                        filtered.append(
                            {"word": n.word, "similarity": round(float(n.similarity), 4)}
                        )
                    if len(filtered) >= top_n:
                        break
                period_data[word] = filtered
            except Exception:
                pass
        result[period] = period_data
    return result


# Stage directions and speech-transcript noise to strip
STAGE_DIRECTION_RE = re.compile(
    r'\b(applause|laughter|laugh|inaudible|crosstalk|cheering|booing|'
    r'sic|pause|ovation|interruption)\b'
)

# Extra stopwords for topic modeling (beyond sklearn's english list)
TOPIC_EXTRA_STOPS = {
    # Function words / modals
    "shall", "upon", "may", "also", "must", "would", "could", "should",
    "might", "will", "can", "yet", "let", "like", "come", "say", "know",
    "think", "want", "just", "going", "got", "get", "go", "make", "take",
    "well", "good", "right", "look", "happen", "need", "sure", "tell",
    "give", "put", "see", "use", "try", "keep", "call", "talk",
    # Conversational / debate noise
    "yes", "yeah", "okay", "sir", "thank", "hey", "wow", "oh",
    "mr", "mrs", "said", "told", "ask", "talk_about", "say_that",
    "not_want", "you_know",
    # Temporal
    "thing", "way", "lot", "time", "day", "year", "today", "night",
    # Roles (not content)
    "president", "vice", "governor", "senator", "congressman",
    "question", "answer", "ahead", "lehrer", "audience", "member",
    "speaker", "everybody", "appreciate",
    # Filler
    "great", "really", "very", "much", "new",
}

# Known important phrases to always detect
MANUAL_PHRASES = {
    ("united", "states"), ("supreme", "court"), ("civil", "war"),
    ("foreign", "affairs"), ("public", "debt"), ("public", "land"),
    ("human", "rights"), ("national", "security"), ("cold", "war"),
    ("social", "security"), ("middle", "east"), ("nuclear", "weapon"),
    ("health", "care"), ("climate", "change"), ("free", "trade"),
    ("american", "people"), ("fellow", "citizen"), ("fellow", "americans"),
    ("god", "bless"), ("executive", "branch"), ("armed", "force"),
    ("founding", "father"), ("civil", "right"), ("white", "house"),
}


def _clean_text_for_topics(text):
    """Remove stage directions and transcript noise from text."""
    # Remove stage directions
    text = STAGE_DIRECTION_RE.sub('', text)
    # Remove parenthetical notes like (Applause) or [laughter]
    text = re.sub(r'[\(\[][^)\]]*[\)\]]', '', text)
    return text


def _detect_bigrams(all_words, min_freq=30, top_n=300):
    """Find significant bigrams, filtering out function-word-heavy pairs.

    Only keeps bigrams where BOTH words are content words — no articles,
    prepositions, pronouns, or other function words at either position.
    """
    # Words that should never appear in a bigram (not meaningful as part of a phrase)
    function_words = {
        "the", "and", "for", "that", "this", "with", "from", "into",
        "have", "has", "had", "been", "was", "were", "are", "will",
        "would", "could", "should", "shall", "may", "might", "can",
        "not", "but", "nor", "its", "our", "their", "your", "his",
        "her", "who", "whom", "which", "what", "where", "when", "how",
        "why", "all", "any", "each", "every", "they", "them", "she",
        "him", "you", "also", "very", "much", "more", "most", "many",
        "such", "some", "other", "own", "too", "only", "just", "even",
        "still", "yet", "than", "then", "now", "here", "there",
        "about", "after", "before", "between", "during", "through",
        "under", "over", "upon", "above", "below", "until", "while",
        "being", "those", "these", "does", "did", "done",
    }

    finder = BigramCollocationFinder.from_words(all_words)
    finder.apply_freq_filter(min_freq)
    # BOTH words must be content words (not function words)
    finder.apply_ngram_filter(lambda w1, w2: w1 in function_words or w2 in function_words)
    # Both words should be 3+ chars
    finder.apply_ngram_filter(lambda w1, w2: len(w1) < 3 or len(w2) < 3)

    bigrams = finder.nbest(BigramAssocMeasures.likelihood_ratio, top_n)
    return set(bigrams) | MANUAL_PHRASES


def _apply_bigrams(words, bigram_set):
    """Join detected bigrams with underscores in a word list."""
    result = []
    i = 0
    while i < len(words):
        if i < len(words) - 1 and (words[i], words[i + 1]) in bigram_set:
            result.append(f"{words[i]}_{words[i + 1]}")
            i += 2
        else:
            result.append(words[i])
            i += 1
    return result


def _read_period_docs(period, bigram_set=None):
    """Read speeches for a period as a list of cleaned documents."""
    corpus_file = DATA_DIR / f"speeches_{period}_lemmatized.txt"
    if not corpus_file.exists():
        return []
    docs = []
    with open(corpus_file, encoding="utf-8") as f:
        current_doc = []
        for line in f:
            line = line.strip().lower()
            if not line:
                if current_doc:
                    docs.append(" ".join(current_doc))
                    current_doc = []
            else:
                cleaned = _clean_text_for_topics(line)
                if cleaned.strip():
                    current_doc.append(cleaned.strip())
        if current_doc:
            docs.append(" ".join(current_doc))

    # Apply bigram joining if provided
    if bigram_set:
        docs = [
            " ".join(_apply_bigrams(doc.split(), bigram_set))
            for doc in docs
        ]

    return docs


def _name_topic(top_words, used_names=None):
    """Generate a thematic name for a topic based on its top words.

    Uses keyword matching against semantic clusters to produce
    a human-readable 2-4 word label. Avoids duplicates via used_names.
    """
    if used_names is None:
        used_names = set()

    ws = set(w.replace("_", " ") for w in top_words)

    # Ordered list of (keywords, primary_label, alt_label) — scored by overlap
    themes = [
        ({"tax", "billion", "budget", "percent", "spending", "deficit", "revenue", "debt", "cut"},
         "Taxation & Budget", "Fiscal Policy"),
        ({"job", "worker", "economy", "business", "trade", "employment", "industry", "labor", "create"},
         "Economy & Employment", "Jobs & Industry"),
        ({"war", "peace", "force", "military", "defense", "army", "nuclear", "weapon", "armed force", "security", "fight"},
         "War & Peace", "Defense & Security"),
        ({"nation", "world", "freedom", "democracy", "liberty", "free", "history"},
         "Freedom & Democracy", "National Ideals"),
        ({"child", "family", "school", "education", "health", "health care", "welfare", "woman", "man"},
         "Family & Social Welfare", "Domestic Life"),
        ({"government", "law", "constitution", "power", "duty", "secretary", "state"},
         "Governance & Law", "Constitutional Order"),
        ({"congress", "act", "pass", "members", "house", "vote", "fellow americans"},
         "Congress & Legislation", "Legislative Action"),
        ({"people", "citizen", "vote", "right", "civil right", "human rights", "rights", "speak", "hear"},
         "Citizens & Rights", "Popular Sovereignty"),
        ({"security", "national security", "terror", "threat", "homeland"},
         "National Security", "Homeland Security"),
        ({"america", "american", "american people", "country", "patriot", "believe", "proud", "strong"},
         "American Identity", "Patriotism & Pride"),
        ({"work", "reform", "change", "problem", "program", "plan", "continue", "support", "welfare", "hard"},
         "Reform & Policy", "Progress & Change"),
        ({"land", "territory", "public land", "indian", "western", "frontier"},
         "Land & Territory", "Western Expansion"),
        ({"states", "union", "united states", "federal", "republic"},
         "Union & Federalism", "The Federal Union"),
        ({"foreign", "treaty", "foreign affairs", "diplomatic", "ally", "international"},
         "Foreign Affairs", "Diplomacy & Treaties"),
        ({"energy", "oil", "climate", "climate change", "environment"},
         "Energy & Environment", "Climate & Energy"),
        ({"love", "believe", "hope", "future", "dream", "strong", "build", "lead"},
         "Vision & Aspiration", "Hope & Leadership"),
    ]

    # Score all themes, pick best available
    scored = []
    for keywords, primary, alt in themes:
        score = len(ws & keywords)
        if score >= 2:
            scored.append((score, primary, alt))

    scored.sort(key=lambda x: x[0], reverse=True)

    for score, primary, alt in scored:
        if primary not in used_names:
            return primary
        if alt not in used_names:
            return alt

    # Fallback: use top 2 distinctive words from the topic
    generic = {"people", "states", "country", "world", "nation", "american",
               "help", "build", "strong", "future", "believe"}
    content = [w.replace("_", " ").title() for w in top_words
               if w.replace("_", " ") not in generic][:3]
    fallback = " & ".join(content[:2]) if content else "Miscellaneous"

    # Deduplicate fallback too
    if fallback in used_names:
        fallback = " & ".join(content[:3]) if len(content) >= 3 else fallback + " II"
    return fallback


def compute_unified_topics(n_topics=10, top_n_words=10):
    """Fit a single NMF topic model on all periods for consistent tracking.

    Preprocesses text to:
    - Remove stage directions (applause, laughter, etc.)
    - Detect and join significant bigrams (united_states, etc.)
    - Filter additional stopwords (shall, upon, etc.)

    Returns:
        - topics: list of topic dicts with id, name, words
        - per_period_topics: topic details per period (top words within that period)
        - topic_timeseries: topic proportion per period over time
    """
    # First pass: read all text to detect bigrams
    print("  Detecting significant bigrams...")
    all_words = []
    for period in PERIODS:
        corpus_file = DATA_DIR / f"speeches_{period}_lemmatized.txt"
        if not corpus_file.exists():
            continue
        with open(corpus_file, encoding="utf-8") as f:
            for line in f:
                cleaned = _clean_text_for_topics(line.strip().lower())
                words = [w for w in cleaned.split() if len(w) >= 3]
                all_words.extend(words)

    bigram_set = _detect_bigrams(all_words)
    print(f"  Found {len(bigram_set)} significant bigrams")
    # Show some examples
    sample = sorted(bigram_set, key=lambda b: b[0])[:10]
    for b in sample:
        print(f"    {b[0]}_{b[1]}")

    # Second pass: read documents with bigram joining
    print("  Reading all corpora with bigram joining...")
    all_docs = []
    doc_periods = []

    for period in PERIODS:
        docs = _read_period_docs(period, bigram_set)
        all_docs.extend(docs)
        doc_periods.extend([period] * len(docs))

    print(f"  Total documents: {len(all_docs)}")

    # Build combined stop words (include underscore variants for bigram stopwords)
    from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
    all_stops = list(ENGLISH_STOP_WORDS | TOPIC_EXTRA_STOPS
                     | {"god_bless", "thank_you"})

    # Fit unified TF-IDF (token pattern allows underscores for bigrams)
    tfidf = TfidfVectorizer(
        max_features=3000, min_df=3, max_df=0.85,
        token_pattern=r'\b[a-z][a-z_]{2,}\b',
        stop_words=all_stops,
    )
    tfidf_matrix = tfidf.fit_transform(all_docs)
    feature_names = tfidf.get_feature_names_out()

    # Fit unified NMF
    print(f"  Fitting NMF with {n_topics} topics...")
    nmf = NMF(n_components=n_topics, max_iter=500, init="nndsvd", random_state=42)
    doc_topics = nmf.fit_transform(tfidf_matrix)  # (n_docs, n_topics)

    # Extract global topics with names (deduplicated)
    used_names = set()
    topics = []
    for topic_idx in range(n_topics):
        weights = nmf.components_[topic_idx]
        top_indices = np.argsort(weights)[-top_n_words:][::-1]
        total = weights.sum()
        word_list = [
            {"word": _format_bigram(feature_names[i]), "weight": round(float(weights[i] / total), 4) if total > 0 else 0}
            for i in top_indices
        ]
        top_words = [feature_names[i] for i in top_indices[:15]]
        name = _name_topic(top_words, used_names)
        used_names.add(name)

        topics.append({
            "id": topic_idx,
            "name": name,
            "words": word_list,
        })

    # Compute topic proportions per period (time series)
    topic_timeseries = []
    for period in PERIODS:
        mask = [i for i, p in enumerate(doc_periods) if p == period]
        if not mask:
            continue
        period_doc_topics = doc_topics[mask]
        avg_proportions = period_doc_topics.mean(axis=0)
        total = avg_proportions.sum()
        if total > 0:
            avg_proportions = avg_proportions / total

        year = int(period.split("-")[0])
        for topic_idx in range(n_topics):
            topic_timeseries.append({
                "year": year,
                "period": period,
                "topic_id": topic_idx,
                "topic_name": topics[topic_idx]["name"],
                "proportion": round(float(avg_proportions[topic_idx]), 4),
            })

    # Per-period top words
    per_period_topics = {}
    for period in PERIODS:
        mask = [i for i, p in enumerate(doc_periods) if p == period]
        if not mask:
            continue
        period_tfidf = tfidf_matrix[mask]
        period_doc_topics = doc_topics[mask]

        period_topics = []
        for topic_idx in range(n_topics):
            topic_weights = period_doc_topics[:, topic_idx]
            if topic_weights.sum() == 0:
                continue
            weighted_tfidf = (period_tfidf.T.multiply(topic_weights)).T.mean(axis=0)
            weighted_tfidf = np.asarray(weighted_tfidf).flatten()

            top_indices = np.argsort(weighted_tfidf)[-top_n_words:][::-1]
            total = weighted_tfidf[top_indices].sum()
            word_list = [
                {"word": _format_bigram(feature_names[i]), "weight": round(float(weighted_tfidf[i] / total), 4) if total > 0 else 0}
                for i in top_indices
                if weighted_tfidf[i] > 0
            ]

            period_topics.append({
                "id": topic_idx,
                "name": topics[topic_idx]["name"],
                "words": word_list,
            })

        per_period_topics[period] = period_topics

    return topics, per_period_topics, topic_timeseries


def _format_bigram(token):
    """Convert 'united_states' to 'united states' for display."""
    return token.replace("_", " ").strip()


def compute_shift_heatmap(models):
    """Compute a word x period-transition shift matrix for a heatmap."""
    periods = sorted(models.keys())
    rows = []

    for i in range(len(periods) - 1):
        p1, p2 = periods[i], periods[i + 1]
        m1, m2 = models[p1], models[p2]
        aligner = ProcrustesAligner()
        aligner.fit(m1.embeddings, m2.embeddings, m1.vocabulary, m2.vocabulary)

        transition_label = f"{p1} → {p2}"
        for word in TARGET_WORDS:
            sim = aligner.get_word_similarity(word, m1.embeddings, m2.embeddings)
            if sim is not None:
                rows.append({
                    "word": word,
                    "transition": transition_label,
                    "year": int(p1.split("-")[0]),
                    "shift": round(float(1 - sim), 4),
                })

    return rows


def compute_vocab_stats(models):
    """Compute vocabulary statistics per period."""
    stats = []
    for period, model in sorted(models.items()):
        stats.append({
            "period": period,
            "year": int(period.split("-")[0]),
            "vocab_size": len(model.vocabulary),
            "embedding_dim": model.embeddings.shape[1] if model.embeddings is not None else 0,
        })
    return stats


def main():
    print("=== Training models ===")
    models = train_models()
    print(f"Loaded {len(models)} period models\n")

    print("=== Computing consecutive shifts ===")
    consecutive, alignment_stats = compute_consecutive_shifts(models)

    print("=== Computing cumulative shifts ===")
    cumulative = compute_cumulative_shifts(models)

    print("=== Computing nearest neighbors ===")
    neighbors = compute_nearest_neighbors(models)

    print("=== Computing unified topics ===")
    global_topics, per_period_topics, topic_timeseries = compute_unified_topics()

    print("=== Computing heatmap data ===")
    heatmap = compute_shift_heatmap(models)

    print("=== Computing vocab stats ===")
    vocab_stats = compute_vocab_stats(models)

    data = {
        "meta": {
            "title": "Semantic Shifts in Presidential Rhetoric",
            "subtitle": "U.S. Presidential Speeches 1775–2024",
            "description": "Tracking how the meaning of political concepts evolves across 250 years of American presidential discourse, using memory-efficient word embeddings and Procrustes alignment.",
            "periods": PERIODS,
            "target_words": TARGET_WORDS,
        },
        "vocab_stats": vocab_stats,
        "alignment_stats": alignment_stats,
        "consecutive_shifts": consecutive,
        "cumulative_shifts": cumulative,
        "heatmap": heatmap,
        "neighbors": neighbors,
        "global_topics": global_topics,
        "topics_by_period": per_period_topics,
        "topic_timeseries": topic_timeseries,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w") as f:
        json.dump(data, f, indent=2)

    print(f"\nDone! Data written to {OUTPUT}")


if __name__ == "__main__":
    main()
