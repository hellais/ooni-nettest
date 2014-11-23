var Map = {
    id: 'map',
    onclick: function(country_code){
        console.log(country_code);
    },
    draw: function (data)
    {
        var that = this;
        var map = new Datamap({
            element: document.getElementById('map'),
            height: 500,
            done: function(datamap){
                datamap.svg.selectAll('.datamaps-subunit').on('click', function(geography) {
                    that.onclick(geography.id);
                });
            },
            fills: {
                defaultFill: 'rgb(230,230,230)'
            }
        });

        var maximum = 0;
        for(country in data){
            if(data.hasOwnProperty(country)){
                maximum = data[country].length > maximum ? data[country].length : maximum;
            }
        }
        var quantize = d3.scale.quantile().domain([0, maximum]).range(d3.range(9)),
            color_updates = {},
            colorbrewer = [
                'rgb(248,251,255)',
                'rgb(222,235,247)',
                'rgb(198,219,239)',
                'rgb(158,202,225)',
                'rgb(107,174,214)',
                'rgb(66,146,198)',
                'rgb(33,113,181)',
                'rgb(8,81,156)',
                'rgb(8,48,107)',
            ];

        for(country in data){
            if(data.hasOwnProperty(country)){
                var cc = country_codes[country],
                    index = quantize(data[country].length);
                color_updates[cc] = colorbrewer[index];
            }
        }
        map.updateChoropleth(color_updates);
    },
}

var Timeline = {
    draw: function (data)
    {
        var parseDate = d3.time.format("%a %b %d %Y").parse,
            processed_data = [];
        for(day in data){
            if(data.hasOwnProperty(day)){
                processed_data.push({start_time: parseDate(day), number: data[day].length});
            }
        }

        var margin = {top: 20, right: 20, bottom: 100, left: 50},
            width = 960 - margin.left - margin.right,
            height = 500 - margin.top - margin.bottom;

        var x = d3.time.scale()
                  .range([0, width])
                  .domain(d3.extent(processed_data, function(d) { return d.start_time; }));

        var y = d3.scale.linear()
                  .range([height, 0])
                  .domain([0, d3.max(processed_data, function(d) { return d.number; })]);

        var xAxis = d3.svg.axis()
                      .scale(x)
                      .ticks(d3.time.month, 1)
                      .orient("bottom");

        var yAxis = d3.svg.axis()
                      .scale(y)
                      .orient("left");

        var area = d3.svg.area()
                     .x(function(d) { return x(d.start_time); })
                     .y0(height)
                     .y1(function(d) { return y(d.number); });

        var svg = d3.select(".timeline").append("svg")
                    .attr("class", "center-block")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                  .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          svg.append("path")
              .datum(processed_data)
              .attr("class", "area")
              .attr("d", area);

          svg.append("g")
              .attr("class", "x axis")
              .attr("transform", "translate(0," + height + ")")
              .call(xAxis)
              .selectAll("text")
                   .style("text-anchor", "end")
                   .attr("dx", "-.8em")
                   .attr("dy", ".15em")
                   .attr("transform", function(d){
                       return "rotate(-65)";
                   });

          svg.append("g")
              .attr("class", "y axis")
              .call(yAxis);
    },
}

var Histogram = {
    id: 'histogram',
    onclick: function(data, index)
    {
        console.log(d3.event, data, this);
    },
    draw: function (data)
    {
        var margin = {top: 20, right: 20, bottom: 250, left: 40},
            width = 800 - margin.left - margin.right,
            height = 500 - margin.top - margin.bottom;

        var processed_data = [];
        for(nettest in data){
            if(data.hasOwnProperty(nettest)){
                processed_data.push({nettest: nettest, measurements: data[nettest].length})
            }
        }

        var x = d3.scale.ordinal()
                  .rangeRoundBands([0, width], .1)
                  .domain(Object.keys(data));

        var y = d3.scale.linear()
                  .range([height, 0])
                  .domain([0, d3.max(processed_data, function(d) { return d.measurements; })]);

        var xAxis = d3.svg.axis()
                      .scale(x)
                      .orient("bottom");

        var yAxis = d3.svg.axis()
                      .scale(y)
                      .orient("left");

        var svg = d3.select(".histogram").append("svg")
                    .attr("class", "center-block")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        svg.append("g")
           .attr("class", "x axis")
           .attr("transform", "translate(0, " + height + ")")
           .call(xAxis)
           .selectAll("text")
                .style("text-anchor", "end")
                .attr("dx", "-.8em")
                .attr("dy", ".15em")
                .attr("transform", function(d){
                    return "rotate(-65)";
                });

        svg.append("g")
           .attr("class", "y axis")
           .call(yAxis);

        var that = this;
        svg.selectAll(".bar")
           .data(processed_data)
           .enter().append("rect")
           .on('click', function(data,index) { that.onclick(data, index); })
           .attr("class", "bar")
           .attr("x", function(d) { return x(d.nettest); })
           .attr("width", x.rangeBand())
           .attr("y", function(d) { return y(d.measurements); })
           .attr("height", function(d) { return height - y(d.measurements); });
    },
}

var MainController = {
    init: function (reports){
        this.index(reports),
        this.map = Object.create(Map);
        this.histogram = Object.create(Histogram);
        this.timeline = Object.create(Timeline);

        this.histogram.draw(this.data_indexed['test_name']);
        this.timeline.draw(this.data_indexed['start_time']);
        this.map.draw(this.data_indexed['probe_cc']);
    },

    // Group the array of reports given as input by its probe_cc and test_name field values.
    index: function (reports)
    {
        var len = reports.length,
            keys = ['probe_cc', 'test_name'],
            data_indexed = {'probe_cc': {}, 'test_name': {}, 'start_time': {}};

        for(var i = 0; i < len; i++){
            keys.forEach(function (key){
                var val = reports[i][key];
                if(Object.keys(data_indexed[key]).indexOf(val) == -1){
                    data_indexed[key][val]= [];
                }
                data_indexed[key][val].push(i);
            });
        }

        var last_day = (new Date(reports[0].start_time*1000)).toDateString(),
            for_each_day = [];
        for(var i = 1; i < len; i++){
            var curr_day = new Date(reports[i].start_time*1000);
            if(curr_day.toDateString() === last_day){
                for_each_day.push(i);
            }else{
                data_indexed.start_time[last_day] = for_each_day;
                for_each_day = [];
                last_day = curr_day.toDateString();
            }
        }

        this.data_indexed = data_indexed;
    },
}

main_controller = Object.create(MainController);
main_controller.init(reports);
