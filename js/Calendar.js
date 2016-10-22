class Calendar {
    // Handles the UI construction of the calendar
    constructor() {
        var self = this;

        this.weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

        this.resetCalendar();

        this.removeTimes = false;

        this.isLoading = false;

        this.bindNextPrev();
        this.initializeTooltips();

        this.bindSchedulePhotoDL();
        this.bindRemoveBlockedTimes();

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

        // We want to bind the mouse up handler for blocking times
        $(document).mouseup(function () {
            self.mouseDown = false;

            // Change each deep array to strings for comparison
            var blockedTimesString = JSON.stringify(self.blockedTimes);
            var prevBlockedTimesString = JSON.stringify(self.prevBlockedTimes);

            // Check if the blocked times changed, if so, restart generation
            if (blockedTimesString != prevBlockedTimesString) {
                window.mycourses.startGeneration();
            }

            // Reset prev
            self.prevBlockedTimes = self.blockedTimes;
        });
    }

    /*
        Initializes the tooltips associated with buttons on the calendar
    */
    initializeTooltips() {
        // Initialize prev/next sched tooltips
        $("#prevSchedule").tooltip();
        $("#nextSchedule").tooltip();

        // Initialize left side button tooltips
        $("#dlSchedulePhoto").tooltip();
        $("#removeBlockedTimes").tooltip();
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
        Binds button that allows you to remove all blocked times
    */
    bindRemoveBlockedTimes() {
        var self = this;

        $("#removeBlockedTimes").click(function () {   
            // Make sure there are actually blocked times before regenning
            if (JSON.stringify(self.blockedTimes) != "[]") {
                self.blockedTimes = [];
                self.prevBlockedTimes = [];

                // Visually remove all of the blocked times
                self.removeAllBlockedTimeUI();

                window.mycourses.startGeneration();
            }
        })
    }

    /*
        Visually removes all blocked times from the Schedule UI
    */
    removeAllBlockedTimeUI() {
        $(".calendar").find(".blockedTime").toggleClass("blockedTime");
    }

    /*
        Starts loading animation
    */
    startLoading(message) {
        this.clearEvents();

        // If it is already loading, don't add another loading sign
        if (this.isLoading == false) {
            this.loading = new Loading($("#schedule").find(".wrap:first"), message, "position: absolute; top: 20%; left: 40%;");
            this.isLoading = true;
        }
    }

    /*
        If there is a loading animation, stops it
    */
    doneLoading(cb) {
        var self = this;
        self.loadingcb = cb;

        if (self.isLoading) {
            self.loading.remove(function () {
                self.isLoading = false;
                self.loadingcb();
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
    resizeCalendarNoScroll(startDay, endDay, startHour, endHour) {

        // If the difference between the start and end hours is less than 6, extend the end hour
        // This is to make sure the appearance of the calendar doesn't look weird and
        // that every row is 20px high
        
        var self = this;

        if ((endHour - startHour) < 6) {
            endHour += 6 - (endHour - startHour);
        }

        if (endHour > 24) {
            endHour = 24;
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
                table += "<td day='" + x + "'";

                // Check if this is a blocked time
                if (self.blockedTimes[x] != undefined) {
                    if (self.blockedTimes[x].indexOf(hour + "-" + min) > -1) {
                        table += ' class="blockedTime"';
                    }
                }

                table += "></td>";
            }

            table += "</tr>";

            min += 30;
        }

        table += '</tbody></table></div>';

        table = $(table);

        // bind the blocked times mouse events 
        table.find("td:not(.headcol)").mousedown(function () {
            // If the first block you mouse down on causes a certain event,
            // you can only cause that event when hovering over other blocks

            // Ex. If you start of removing a time block, you can only remove
            // other timeblocks when you hover

            // Preserve the old copy of the blocked times for the mouseUp document event
            self.prevBlockedTimes = jQuery.extend(true, [], self.blockedTimes);

            self.mouseDown = true;

            // check the event we're making
            var thisday = parseInt($(this).attr("day"));
            var thistime = $(this).parent().attr("id");

            // we want to populate the index if it's undefined
            if (self.blockedTimes[thisday] == undefined) {
                self.blockedTimes[thisday] = [];
            }

            // check whether we've already blocked this timeslot
            if (self.blockedTimes[thisday].indexOf(thistime) > -1) {
                // we want to remove it
                self.removeTimes = true;
                var thisindex = self.blockedTimes[thisday].indexOf(thistime);

                // modify the array
                self.blockedTimes[thisday].splice(thisindex, 1);
            }
            else {
                // we want to add blocked times
                self.removeTimes = false;
                self.blockedTimes[thisday].push(thistime);
            }

            // Toggle the visual class
            $(this).toggleClass("blockedTime");

        }).mouseover(function () {
            if (self.mouseDown) {
                // get the data for this time block
                var thisday = parseInt($(this).attr("day"));
                var thistime = $(this).parent().attr("id");

                if (self.blockedTimes[thisday] == undefined) {
                    self.blockedTimes[thisday] = [];
                }

                if (self.removeTimes == true && self.blockedTimes[thisday].indexOf(thistime) > -1) {
                    // we want to remove this timeblock
                    var thisindex = self.blockedTimes[thisday].indexOf(thistime);
                    self.blockedTimes[thisday].splice(thisindex, 1);

                    // toggle the class
                    $(this).toggleClass("blockedTime");
                }
                else if (self.removeTimes == false && self.blockedTimes[thisday].indexOf(thistime) == -1) {
                    // we want to add blocked times
                    self.blockedTimes[thisday].push(thistime);

                    // toggle the class
                    $(this).toggleClass("blockedTime");
                }
            }
        });

        // append the table
        $("#schedule").find(".outer:first").append(table);
    }

    /*
        If there are blocked times, fits the schedule to display them all
    */
    displayBlockedTimes() {
        var maxDay = -1;
        var minDay = 7;

        var minTime = 1440;
        var maxTime = 0;

        // Iterate through the blocked times
        for (var day in this.blockedTimes) {
            var thisDay = this.blockedTimes[day];

            if (thisDay != undefined && thisDay.length > 0) {
                // Check if it sets a new day range
                if (day < minDay) minDay = day;
                if (day > maxDay) maxDay = day;

                // Iterate times
                for (var time in thisDay) {
                    var thistime = thisDay[time];

                    var totalMin = parseInt(thistime.split("-")[0])*60 + parseInt(thistime.split("-")[1]);

                    // Check if it sets a new time range
                    if (totalMin > maxTime) maxTime = totalMin;
                    if (totalMin < minTime) minTime = totalMin;
                }
            }
        }
        
        // Make sure there are actually some blocked times
        if (maxDay > -1 && minDay < 7 && minTime < 1440 && maxTime > 0) {
            // Make sure its atleast monday to friday
            if (minDay != 0) minDay = 0;
            if (maxDay < 4) maxDay = 4;

            // Draw it
            this.resizeCalendarNoScroll(minDay, maxDay, Math.floor(minTime/60), Math.floor(maxTime/60)+1);
        }
    }

    /*
        Resets the calendar (removes timeblocks and current schedules)
    */
    resetCalendar() {
        this.blockedTimes = [];
        this.prevBlockedTimes = [];

        this.setTotalGenerated(0);
        this.setCurrentIndex(-1);

        this.resizeCalendarNoScroll(0, 4, 9, 17);
    }
}
