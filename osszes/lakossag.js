var margin_020301 = {
    top: window.innerHeight / 25,
    right: window.innerWidth / 25,
    bottom: window.innerHeight / 25,
    left: window.innerWidth / 25
};

var w_020301 = (window.innerWidth - margin_020301.left - margin_020301.right) * 0.95;
var h_020301 = (window.innerHeight - margin_020301.top - margin_020301.bottom) * 0.8;

var parseDate_020301 = d3.timeParse("%Y");

var scaleX_020301 = d3.scaleTime()
    .range([0, w_020301]);

var scaleY_020301 = d3.scaleLinear()
    .range([h_020301, 0]);

var color_020301 = d3.scaleOrdinal()
    .range(["#385988", "#43B02A", "#FF671F", "#A4343A", "#00AFD7", "#C4D600"]);
//.range(["#045A8D", "#43B02A", "#74A9CF", "#A6BDDB", "#00AFD7", "#980043", "#DD1C77", "#DF65B0", "#C994C7","#B30000", "#E34A33", "#FC8D59", "#C4D600", "#FF671F"]);

var xAxis_020301 = d3.axisBottom()
    .scale(scaleX_020301)
    .ticks(25);

var yAxis_020301 = d3.axisLeft()
    .scale(scaleY_020301)

var line_020301 = d3.line()
    .x(function (d) {
        return scaleX_020301(d.date)
    })
    .y(function (d) {
        return scaleY_020301(d.ydata)
    })

var svg_020301 = d3.select("body").append("svg")
    .attr("width", w_020301 + margin_020301.left + margin_020301.right)
    .attr("height", h_020301 + margin_020301.top + margin_020301.bottom)
    .append("g")
    .attr("transform", "translate(" + margin_020301.left + ", " + margin_020301.top + ")")



d3.csv("lakossag_összes.csv", type_020301, function (error, data) {
    if (error) throw error;

    var categories_020301 = data.columns.slice(1).map(function (name) {
        return {
            name: name,
            values: data.map(function (d) {
                return {
                    date: d.date,
                    ydata: d[name]
                };
            })
        };
    });

    var keys_020301 = data.columns.slice(1);

    scaleX_020301.domain([
    d3.min(categories_020301, function (c) {
            return d3.min(c.values, function (c) {
                return c.date;
            });
        }),
    d3.max(categories_020301, function (c) {
            return d3.max(c.values, function (c) {
                return c.date;
            });
        })]);

    scaleY_020301.domain([
    d3.min(categories_020301, function (c) {
            return d3.min(c.values, function (d) {
                return d.ydata;
            });
        }),
    d3.max(categories_020301, function (c) {
            return d3.max(c.values, function (d) {
                return d.ydata;
            });
        })]).nice();

    var legend_020301 = svg_020301.selectAll("g")
        .data(categories_020301)
        .enter()
        .append("g")
        .attr("class", "legend_020301");

    legend_020301.append("rect")
        //.attr("x", (w_020301 / 3))
        //.attr("y", 0 - (margin_020301.top / 11))
        .attr("x", margin_020301.top + (w_020301 / 2))
        .attr("y", function (d, i) {
            return (i * 15) + (h_020301 / 4.5);
        })
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", function (d) {
            return color_020301(d.name);
        });

    legend_020301.append("text")
        .attr("x", margin_020301.top + (w_020301 / 2.05))
        .attr("y", function (d, i) {
            return (i * 15) + (h_020301 / 4.15);
        })
        .attr("font-size", function () {
            if (w_020301 <= 400) {
                return (w_020301 * 0.0005 + 0.5) + "em"
            } else {
                return "12px"
            };
        })
        .text(function (d) {
            return d.name;
        })
        .style("text-anchor", "end");


    // Draw the line
    var category_020301 = svg_020301.selectAll(".category_020301")
        .data(categories_020301)
        .enter().append("g")
        .attr("class", "category_020301");

    category_020301.append("path")
        .attr("class", "line_020301")
        .attr("d", function (d) {
            return line_020301(d.values);
        })
        .style("stroke", function (d) {
            return color_020301(d.name)
        });

    // Draw the empty value for every point
    var points_020301 = svg_020301.selectAll('.points')
        .data(categories_020301)
        .enter()
        .append('g')
        .attr('class', 'points_020301')
        .append('text');

    var timeScales_020301 = data.map(function (name) {
        return scaleX_020301(name.date);
    });
    var fontsize = Math.round(Math.log2(w_020301));
    var fontsizeY;
    var fontsiteX;
    if (w_020301 < 500) {
        fontsizeY = fontsize * 0.55;
    } else {
        fontsizeY = fontsize * 0.7;
    }
    fontsizeX = fontsize;
    fontsizeY = fontsizeY.toString().concat("px sans-serif");
    fontsizeX = fontsizeX.toString().concat("px sans-serif");


    /*
    svg_020301.append("g")
        .attr("class", "x axis_020301")
        .attr("transform", "translate(0, "+h_020301+")")
        .call(xAxis_020301)
        .style("font", "12px sans-serif")
        .selectAll("text")
                .style("text-anchor", "end")
                .attr("dx", "-.8em")
                .attr("dy", ".15em")
                .attr("transform", function(d) {
                    return "rotate(-65)"
                    });
    svg_020301.append("g")
        .attr("class", "y axis_020301")
        .call(yAxis_020301)
        .style("font", "12px sans-serif")
        ;
    */

    svg_020301.append("g")
        .attr("class", "x axis_020301")
        .attr("transform", "translate(0, " + h_020301 + ")")
        .call(xAxis_020301)
        .selectAll("text")
        .style("font", fontsizeX)
        .attr("transform", "rotate(-45)");;

    svg_020301.append("g")
        .attr("class", "y axis_020301")
        .call(yAxis_020301)
        .selectAll("text")
        .style("font", fontsizeY)
        .attr("transform", "rotate(35)");

    svg_020301.append("text")
        .attr("class", "title_020301")
        .attr("x", (w_020301 / 2))
        .attr("y", 0 - (margin_020301.top / 2))
        .attr("text-anchor", "middle")
        .style("font", "16px sans-serif")
        .text("Distribution of the population by city size");


    svg_020301.append("text")
        .attr("class", "data_source_020301")
        .attr("x", w_020301)
        .attr("y", h_020301 + 50)
        .attr("font-size", function () {
            if (w_020301 <= 400) {
                return (w_020301 * 0.0005 + 0.5) + "em"
            } else {
                return "14px"
            };
        })
        .style("text-anchor", "end")
        .on("mouseout", function () {
            d3.select(this).style("cursor", "default");
        })
        .on("mousemove", function (d) {
            d3.select(this).style("cursor", "pointer");
        });

    var mouseG_020301 = svg_020301.append("g") // this the black vertical line to follow mouse
        .attr("class", "mouse-over-effects_020301");

    mouseG_020301.append("path")
        .attr("class", "mouse-line_020301")
        .style("stroke", "black")
        .style("stroke-width", "1px")
        .style("opacity", "0");


    var lines_020301 = document.getElementsByClassName("line_020301");

    var mousePerLine_020301 = mouseG_020301.selectAll(".mouse-per-line_020301")
        .data(categories_020301)
        .enter()
        .append("g")
        .attr("class", "mouse-per-line_020301");

    mousePerLine_020301.append("circle")
        .attr("r", 7)
        .style("stroke", function (d) {
            return color_020301(d.name);
        })
        .style("fill", "none")
        .style("stroke-width", "1px")
        .style("opacity", "0");

    mousePerLine_020301.append("text")
        .attr("transform", "translate(10, 3)");

    mouseG_020301.append("rect")
        .attr("width", w_020301)
        .attr("height", h_020301)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on("mouseout", function () {
            d3.select(".mouse-line_020301").style("opacity", "0");
            d3.selectAll(".mouse-per-line_020301 circle").style("opacity", "0");
            d3.selectAll(".mouse-per-line_020301 text").style("opacity", "0")
        })
        .on("mouseover", function () {
            d3.select(".mouse-line_020301").style("opacity", "1");
            d3.selectAll(".mouse-per-line_020301 circle").style("opacity", "1");
            d3.selectAll(".mouse-per-line_020301 text").style("opacity", "1")
        })
        .on("mousemove", function () {
            var mouse_020301 = d3.mouse(this),
                j_020301 = d3.bisect(timeScales_020301, mouse_020301[0], 1),
                di_020301 = data[j_020301 - 1];

            d3.select(".mouse-line_020301")
                .attr("d", function () {
                    var d_020301 = "M" + mouse_020301[0] + ", " + h_020301;
                    d_020301 += " " + mouse_020301[0] + ", " + 0;
                    return d_020301;
                })

            var ypos_020301 = [];

            d3.selectAll(".mouse-per-line_020301")
                .attr("transform", function (d, i) {
                    var xDate_020301 = scaleX_020301.invert(mouse_020301[0]),
                        bisect_020301 = d3.bisector(function (d) {
                            return d.date;
                        }).right;
                    idx_020301 = bisect_020301(d.values, xDate_020301);

                    var beginning_020301 = 0,
                        end_020301 = lines_020301[i].getTotalLength(),
                        target_020301 = null;

                    while (true) {
                        target_020301 = Math.floor((beginning_020301 + end_020301) / 2);

                        pos_020301 = lines_020301[i].getPointAtLength(target_020301);

                        if ((target_020301 === end_020301 || target_020301 === beginning_020301) && pos_020301.x !== mouse_020301[0]) {
                            break;
                        }
                        if (pos_020301.x > mouse_020301[0]) end_020301 = target_020301;
                        else if (pos_020301.x < mouse_020301[0]) beginning_020301 = target_020301;
                        else break; //position found
                    }

                    d3.select(this).select('text')
                        .text(di_020301[keys_020301[i]]);

                    ypos_020301.push({
                        ind: i,
                        y: pos_020301.y,
                        off: 0
                    });

                    return "translate(" + mouse_020301[0] + ", " + pos_020301.y + ")"
                })

                .call(function (sel) {
                    ypos_020301.sort(function (a, b) {
                        return a.y - b.y;
                    });
                    ypos_020301.forEach(function (p, i) {
                        if (i > 0) {
                            var last_020301 = ypos_020301[i - 1].y;
                            ypos_020301[i].off = Math.max(0, (last_020301 + 15) - ypos_020301[i].y);
                            ypos_020301[i].y += ypos_020301[i].off;
                        }
                    })
                    ypos_020301.sort(function (a, b) {
                        return a.ind - b.ind;
                    });
                })

                .select("text")
                .attr("transform", function (d, i) {
                    return "translate(10, " + (3 + ypos_020301[i].off) + ")";
                })
                .attr("font-size", function () {
                    if (w_020301 <= 400) {
                        return (w_020301 * 0.0005 + 0.5) + "em"
                    } else {
                        return "14px"
                    };
                });
        });
});

function type_020301(d, _, columns) {
    d.date = parseDate_020301(d.date);
    for (var i_020301 = 1, n = columns.length, c; i_020301 < n; ++i_020301) d[c = columns[i_020301]] = +d[c];
    return d;
}

/*Sources:
https://bl.ocks.org/mbostock/3884955
https://www.codeseek.co/Asabeneh/d3-mouseover-multi-line-chart-d3js-v4-RZpYBo
https://codepen.io/savemuse/pen/bgQQxp
*/
