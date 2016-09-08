class Calendar {
    // Handles the UI construction of the calendar
    constructor() {
        this.weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

        console.log("Setting up calendar");

        this.resizeCalendar(0, 4, 9, 18);

        this.bindNextPrev();
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

        // Clear all the current events on the calendar
        self.clearEvents();

        console.log("This schedule");
        console.log(schedule);

        for (var classv in schedule) {
            var thisclass = schedule[classv];

            var text = thisclass["name"] + " - " + thisclass["type"] + " - " + thisclass["id"];

            // for every time
            for (var time in thisclass["times"]) {
                var thistime = thisclass["times"][time];

                // make sure there isn't a -1 in the days
                if (thistime[0].indexOf(-1) == -1) {
                    this.addEvent(Generator.totalMinutesToTime(thistime[1][0]), Generator.totalMinutesToTime(thistime[1][1]), thistime[0], text);
                }                
            }
        }
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
    addEvent(starttime, endtime, days, text) {
        var starthour = parseInt(starttime.split(":")[0]);
        var startmin = parseInt(starttime.split(":")[1]);

        var endhour = parseInt(endtime.split(":")[0]);
        var endmin = parseInt(endtime.split(":")[1]);

        // find closest 15min for the start time
        if (startmin % 15 > 7) {
            startmin = (Math.floor(startmin/15) + 1) * 15;
        }
        else {
            // round down
            startmin = Math.floor(startmin/15) * 15;
        }

        if (startmin == 60) {
            starthour += 1;
            startmin = 0;
        }

        // figure out how many minutes are in between the two times
        var totalstartmin = starthour*60 + startmin;
        var totalendmin = endhour*60 + endmin;

        var totalmin = totalendmin - totalstartmin;

        // Calculate the height of the box
        var totalheight = 0;

        // Every 15min is 20px
        totalheight += (totalmin/15)*20;

        // remove padding
        totalheight -= 4;

        // draw the boxes

        for (var day in days) {
            day = days[day];

            // find the parent
            var tdelement = $("#schedule").find("#" + starthour + "-" + startmin);
            tdelement = tdelement.find("td:eq(" + (day+1) + ")")

            // empty it
            tdelement.empty();

            // create the element and append it
            var html = '<div class="event" style="height: ' + totalheight + 'px;">';

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
}