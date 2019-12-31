d3.csv("dataset.csv").get(function(error, rows) {
  rows.forEach(function(error, d) {
    d.capacity_mw = +d.capacity_mw;
    d.latitude = +d.latitude;
    d.longitude = +d.longitude;
    d.commissioning_year = +d.commissioning_year;
    d.estimated_generation_gwh = +d.estimated_generation_gwh;
  });
  console.log(rows);

  var width = 1300,
    height = 900,
    active = d3.select(null);
  var filter = new Set(["Renewable", "NonRenewable", "Other"]);

  /* source: https://stackoverflow.com/questions/10805184/show-data-on-mouseover-of-circle */
  var tip = d3
    .tip()
    .attr("class", "d3-tip")
    .offset([-10, 0])
    .html(function(d) {
      return (
        "<strong>Power Plant Name: </strong> <span style='color:black'>" +
        d.name +
        "</span><br><strong>Owner: </strong> <span style='color:black'>" +
        d.owner +
        "</span><br><strong>Year: </strong> <span style='color:black'>" +
        d.commissioning_year +
        "</span><br><strong>Country: </strong> <span style='color:black'>" +
        d.country_long +
        "</span><br>" +
        "<br><strong><u>Fuel Types and Power Production</u></strong> <br><strong>Primary Fuel: </strong><span style='color:black'>" +
        d.fuel1 +
        "</span><br> " +
        "<strong>Estimated Power Production (gwh): </strong><span style='color:black'>" +
        d.estimated_generation_gwh +
        "</span><br> "
      );
    });

  var projection = d3.geo
    .mercator()
    .scale(200)
    .translate([width / 2, height / 1.9]);

  var zoom = d3
    .zoom()
    .on("zoom", zoomed)
    .scaleExtent([1, 100]);
  var path = d3.geo.path().projection(projection);

  var svg = d3
    .select("#map")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .on("click", stopped, true);

  svg
    .append("path")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .on("click", reset);

  var g = svg.append("g");

  svg.call(zoom);
  svg.call(tip);

  // Is called when a checkbox is selected
  $(function() {
    callOnCheckboxSelection = function() {
      g.selectAll("circle").remove();

      var renew = document.getElementById("checkRenew");
      var nonRenew = document.getElementById("checkNonRenew");
      var other = document.getElementById("checkOther");

      tempList = [];
      if (other.checked == true) {
        tempList.push("Other");
        tempList.push("Waste");
      }
      if (renew.checked == true) {
        tempList.push("Biomass");
        tempList.push("Hydro");
        tempList.push("Geothermal");
        tempList.push("Solar");
        tempList.push("Wind");
      }
      if (nonRenew.checked == true) {
        tempList.push("Gas");
        tempList.push("Oil");
        tempList.push("Coal");
        tempList.push("Nuclear");
      }

      console.log(tempList);

      var filtRes = rows.filter(function(d) {
        if (tempList.includes(d["fuel1"])) {
          return d;
        }
      });

      console.log(filtRes);

      placePlants(filtRes);
    };
  });

  // Is called when a radio button is selected
  $(function() {
    callOnRadioSelection = function() {
      var location = document.getElementById("bylocation");
      var energy = document.getElementById("byenergy");

      if (location.checked) {
        g.selectAll("circle").attr("r", 1.5);
      } else {
        g.selectAll("circle").attr("r", function(d) {
          return d.estimated_generation_gwh / 2000;
        });
      }
    };
  });

  function placePlants(points) {
    g.selectAll("circle").remove();

    val = 1.5;

    var locations = g
      .selectAll("circle")
      .data(points)
      .enter()
      .append("circle")
      .attr("cx", function(e) {
        return projection([+e.longitude, +e.latitude])[0];
      })
      .attr("cy", function(d) {
        return projection([+d.longitude, +d.latitude])[1];
      })

      .attr("r", val) // radius
      .style("fill", function(d) {
        if (d.fuel1 == "Other" || d.fuel1 == "Waste") {
          return "black";
        } else if (
          d.fuel1 == "Coal" ||
          d.fuel1 == "Gas" ||
          d.fuel1 == "Oil" ||
          d.fuel1 == "Nuclear"
        ) {
          return "red";
        } else if (
          d.fuel1 == "Biomass" ||
          d.fuel1 == "Geothermal" ||
          d.fuel1 == "Hydro" ||
          d.fuel1 == "Solar" ||
          d.fuel1 == "Wind"
        ) {
          return "green";
        }
      })
      .on("mouseover", tip.show)
      .on("mouseout", tip.hide)
      .style("opacity", 0.5);
  }

  d3.json(
    "https://gist.githubusercontent.com/mbostock/4090846/raw/d534aba169207548a8a3d670c9c2cc719ff05c47/world-50m.json",
    function(error, world) {
      if (error) throw error;

      g.selectAll("path")
        .data(topojson.feature(world, world.objects.countries).features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("class", "country_area")
        .on("click", clicked)
        .on();

      g.append("path")
        .datum(
          topojson.mesh(world, world.objects.countries, function(a, b) {
            return a !== b;
          })
        )
        .attr("class", "mesh")
        .attr("id", "borders")
        .attr("d", path);

      placePlants(rows);

      // locations function based on https://codepen.io/jamesthomson/pen/wMzQYG?editors=1010
    }
  );

  function clicked(d) {
    if (active.node() === this) return reset();
    active.classed("active", false);
    active = d3.select(this).classed("active", true);

    var bounds = path.bounds(d),
      dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
      translate = [width / 2 - scale * x, height / 2 - scale * y];

    svg
      .transition()
      .duration(750)
      .call(
        zoom.transform,
        d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
      ); // updated for d3 v4
  }

  function reset() {
    active.classed("active", false);
    active = d3.select(null);

    svg
      .transition()
      .duration(750)
      .call(zoom.transform, d3.zoomIdentity); // updated for d3 v4
  }

  function zoomed() {
    var location = document.getElementById("bylocation");

    t = d3.event.transform.k;
    g.style("stroke-width", 1.5 / d3.event.transform.k + "px");
    if (t > 5 && location.checked == true) {
      g.selectAll("circle").attr("r", 7 / t);
    }
    g.attr("transform", d3.event.transform); // updated for d3 v4
  }

  function stopped() {
    if (d3.event.defaultPrevented) d3.event.stopPropagation();
  }
});
