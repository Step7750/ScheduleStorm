class Calendar {
    // Handles the UI construction of the calendar
    constructor() {
        this.weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

        console.log("Setting up calendar");

        this.resizeCalendarNoScroll(0, 4, 9, 17);

        this.isLoading = false;

        this.bindNextPrev();

        this.bindSchedulePhotoDL();

        this.eventcolours = {
            "#FF5E3A": false,
            "#099e12": false,
            "#1D62F0": false,
            "#FF2D55": false,
            "#8E8E93": false,
            "#0b498c": false,
            "#34AADC": false,
            "#5AD427": false
        }
    }

    /*
        Binds the Schedule Photo Download button and implements the DL functionality
    */
    bindSchedulePhotoDL() {
        var self = this;

        // on click
        $("#dlSchedulePhoto").click(function () {
            // create the canvas
            html2canvas($(".calendar"), {
                onrendered: function (canvas) {            
                    // Download the picture
                    var a = document.createElement('a');
                    a.href = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");

                    // Set the name of the file
                    if (window.uni != null && window.term != null) a.download = window.uni + '_' + window.term + '_ScheduleStorm.png';
                    else a.download = 'ScheduleStorm_Schedule.png';

                    a.click();
                }
            });
        });
    }
    /*
        Starts loading animation
    */
    startLoading(message) {
        this.clearEvents();
        this.loading = new Loading($("#schedule").find(".wrap:first"), message, "position: absolute; top: 20%; left: 40%;");
        this.isLoading = true;
    }

    /*
        If there is a loading animation, stops it
    */
    doneLoading(cb) {
        var self = this;

        if (self.isLoading) {
            self.loading.remove(function () {
                self.isLoading = false;
                cb();
            });
        }
        else {
            self.isLoading = false;
            cb();
        }
    }

    /*
        Sets loading status of the animation
    */
    setLoadingStatus(message) {
        this.loading.setStatus(message);
    }

    /*
        Empties out the calendar
    */
    emptyCalendar() {
        $("#schedule").find(".outer:first").empty();
    }

    /*
        Displays the given schedule
    */
    displaySchedule(schedule) {
        var self = this;

        // set the score
        // make sure its a number
        if (typeof schedule[0] == "number") $("#scheduleScore").text(schedule[0].toFixed(2));

        // Clear all the current events on the calendar
        self.clearEvents();

        console.log("This schedule");
        console.log(schedule);

        self.setScheduleConstraints(schedule);

        for (var classv in schedule) {
            var thisclass = schedule[classv];

            var text = thisclass["name"] + " - " + thisclass["type"] + " - " + thisclass["id"];

            // for every time
            for (var time in thisclass["times"]) {
                var thistime = thisclass["times"][time];

                // make sure there isn't a -1 in the days
                if (thistime[0].indexOf(-1) == -1) {
                    this.addEvent(Generator.totalMinutesToTime(thistime[1][0]), Generator.totalMinutesToTime(thistime[1][1]), thistime[0], text, thisclass["name"]);
                }
            }
        }

        // reset the colour ids
        self.resetColours();
    }

    resetColours() {
        for (var colour in this.eventcolours) {
            this.eventcolours[colour] = false;
        }
    }

    getEventColour(classname) {
        // check if we already have a colour for this class
        for (var colour in this.eventcolours) {
            if (this.eventcolours[colour] == classname) {
                return colour;
            }
        }

        // add a new colour for this class
        for (var colour in this.eventcolours) {
            if (this.eventcolours[colour] == false) {
                this.eventcolours[colour] = classname;
                return colour;
            }
        }

        // there are no colours left, return a default colour
        return "#0275d8";

    }

    /*
        Sets the time constraints of the calendar given a schedule
    */
    setScheduleConstraints(schedule) {
        var maxDay = 4; // we always want to show Mon-Fri unless there are Sat or Sun classes
        var minDay = 0;
        var minHour = 24;
        var maxHour = 0;

        for (var classv in schedule) {
            var thisclass = schedule[classv];

            // for every time
            for (var time in thisclass["times"]) {
                var thistime = thisclass["times"][time];

                // make sure there isn't a -1 in the days
                if (thistime[0].indexOf(-1) == -1) {
                    // check whether the date changes constraints
                    var thisMaxDay = Math.max.apply(null, thistime[0]);

                    if (thisMaxDay > maxDay) {
                        maxDay = thisMaxDay;
                    }

                    // check whether these times change the constraints
                    var startTime = Generator.totalMinutesToTime(thistime[1][0]);
                    var startHour = parseInt(startTime.split(":")[0])

                    if (startHour < minHour) {
                        minHour = startHour;
                    }

                    var endTime = Generator.totalMinutesToTime(thistime[1][1]);
                    var endHour = parseInt(endTime.split(":")[0]) + 1;

                    if (endHour > maxHour) {
                        maxHour = endHour;
                    }
                }                
            }
        }

        this.resizeCalendarNoScroll(minDay, maxDay, minHour, maxHour);
    }

    /*
        Sets the current generated index
    */
    setCurrentIndex(index) {
        var self = this;

        if (index > (self.totalGenerated-1)) {
            // go down to the start at 0
            index = 0;
        }
        if (index < 0) {
            // go to the max index
            index = self.totalGenerated-1;
        }

        self.curIndex = index;

        // show it on the UI
        self.updateIndexUI(self.curIndex+1);
    }

    /*
        Updates the UI with the passed in current schedule index
    */
    updateIndexUI(index) {
        $("#curGenIndex").text(index);
    }

    /*
        Updates the UI with the passed in total generated schedules
    */
    updateTotalUI(total) {
        $("#totalGen").text(total);
    }

    /*
        Sets the total amount of generated schedules for the UI
    */
    setTotalGenerated(total) {
        var self = this;

        self.totalGenerated = total;

        self.updateTotalUI(self.totalGenerated);
    }

    /*
        Binds the buttons that let you go through each generated schedule
    */
    bindNextPrev() {
        var self = this;
        // unbind any current binds
        $("#prevSchedule").unbind();
        $("#nextSchedule").unbind();

        $("#prevSchedule").click(function () {
            if (self.totalGenerated > 0) {
                self.setCurrentIndex(self.curIndex-1);

                // get the schedule
                var newschedules = window.mycourses.generator.getSchedule(self.curIndex);

                if (newschedules != false) {
                    // we got the schedule, now populate it
                    self.displaySchedule(newschedules);
                }
            }
        });

        $("#nextSchedule").click(function () {
            if (self.totalGenerated > 0) {
                self.setCurrentIndex(self.curIndex+1);

                // get the schedule
                var newschedules = window.mycourses.generator.getSchedule(self.curIndex);

                if (newschedules != false) {
                    // we got the schedule, now populate it
                    self.displaySchedule(newschedules);
                }
            }
        });
    }

    /*
        Visually clears all of the events on the calendar
    */
    clearEvents() {
        $("#schedule").find(".event").each(function() {
            $(this).remove();
        });
    }

    /*
        Add an event with start and end time (24 hours)

        Days is an array containing the integers that represent the days that this event is on
    */
    addEvent(starttime, endtime, days, text, classname) {

        var rowheight = $("#schedule").find("td:first").height() + 1;

        var starthour = parseInt(starttime.split(":")[0]);
        var startmin = parseInt(starttime.split(":")[1]);

        var endhour = parseInt(endtime.split(":")[0]);
        var endmin = parseInt(endtime.split(":")[1]);

        // round down to closest 30min or hour
        var roundedstartmin = Math.floor(startmin/30) * 30;

        // figure out how many minutes are in between the two times
        var totalstartmin = starthour*60 + startmin;
        var totalendmin = endhour*60 + endmin;

        var totalmin = totalendmin - totalstartmin;

        // Calculate the height of the box
        var totalheight = 0;

        // Every 30min is rowheight
        totalheight += (totalmin/30)*rowheight;

        // calculate how far from the top the element is
        var topoffset = ((startmin % 30)/30) * rowheight;

        // draw the events
        for (var day in days) {
            day = days[day];

            // find the parent
            var tdelement = $("#schedule").find("#" + starthour + "-" + roundedstartmin);
            tdelement = tdelement.find("td:eq(" + (day+1) + ")");

            // empty it
            tdelement.empty();

            // create the element and append it
            var html = '<div class="event" style="height: ' + totalheight + 'px; top: ' + topoffset + 'px; background: ' + this.getEventColour(classname) + ';">';

            html += text;

            html += '</div>';

            tdelement.append(html);
        }
    }

    /*
        Resizes the calendar to the specified constraints
    */
    resizeCalendar(startDay, endDay, startHour, endHour) {
        this.emptyCalendar();

        // all parameters are inclusive

        // build header
        var header = '<table><thead><tr><th class="headcol"></th>';
        
        for (var x = startDay; x <= endDay; x++) {
            header += "<th>" + this.weekdays[x] + "</th>";
        }

        header += '</tr></thead></table>';

        $("#schedule").find(".outer:first").append(header);
        

        var table = '<div class="wrap"><table class="offset"><tbody>';

        // we start 15 min earlier than the specified start hour
        var min = 45;
        var hour = startHour-1; // 24 hour

        while (hour < endHour) {

            if (min >= 60) {
                min = 0;
                hour += 1;
            }

            // find 12 hour equivalent
            var hours12 = ((hour + 11) % 12 + 1);

            var hourtext = "";
            if (min % 30 == 0) {
                if (min == 0) {
                    // we want to ensure 2 0's
                    hourtext += hours12 + ":00";
                }
                else {
                    hourtext += hours12 + ":" + min;
                }
            }

            // generate the text
            table += "<tr id='" + hour + "-" + min + "'><td class='headcol'>" + hourtext + "</td>";

            var iteratelength = endDay - startDay + 1;

            for (var x = 0; x < iteratelength; x++) {
                table += "<td></td>";
            }

            table += "</tr>";

            min += 15;
        }

        table += '</tbody></table></div>';

        $("#schedule").find(".outer:first").append(table);
    }

    /*
        Resizes the calendar to the specified constraints
    */
    resizeCalendarNoScroll(startDay, endDay, startHour, endHour) {

        // If the difference between the start and end hours is less than 6, extend the end hour
        // This is to make sure the appearance of the calendar doesn't look weird and
        // that every row is 20px high
        
        if ((endHour - startHour) < 6) {
            endHour += 6 - (endHour - startHour);
        }

        var windowheight = $(window).height();
        var calendarheight = windowheight * 0.49;


        this.emptyCalendar();

        // all parameters are inclusive

        // build header
        var header = '<table><thead><tr><th class="headcol"></th>';
        
        for (var x = startDay; x <= endDay; x++) {
            header += "<th>" + this.weekdays[x] + "</th>";
        }

        header += '</tr></thead></table>';

        // append the header
        $("#schedule").find(".outer:first").append(header);
        

        var table = '<div class="wrap"><table class="offset"><tbody>';

        // we start 30 min earlier than the specified start hour
        var min = 30;
        var hour = startHour-1; // 24 hour

        while (hour < endHour) {

            if (min >= 60) {
                min = 0;
                hour += 1;
            }

            // find 12 hour equivalent
            var hours12 = ((hour + 11) % 12 + 1);

            var hourtext = "";
            if (min == 0) {
                // we want to ensure 2 0's
                hourtext += hours12 + ":00";
            }

            // generate the text
            table += "<tr id='" + hour + "-" + min + "'><td class='headcol'>" + hourtext + "</td>";

            var iteratelength = endDay - startDay + 1;

            for (var x = 0; x < iteratelength; x++) {
                table += "<td day='" + x + "'></td>";
            }

            table += "</tr>";

            min += 30;
        }

        table += '</tbody></table></div>';

        $("#schedule").find(".outer:first").append(table);
    }
}