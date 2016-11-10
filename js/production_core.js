"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Calendar = function () {
    // Handles the UI construction of the calendar
    function Calendar() {
        _classCallCheck(this, Calendar);

        var self = this;

        this.weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

        this.resetCalendar();

        this.removeTimes = false;

        this.isLoading = false;

        this.currentSchedule = [];

        this.bindNextPrev();
        this.initializeTooltips();

        // Bind left side buttons
        this.bindSchedulePhotoDL();
        this.bindRemoveBlockedTimes();
        this.bindCopyScheduleToClipboard();
        this.bindFacebookSharing();
        this.bindImgurUpload();

        // Key binds
        this.keyBinds();

        // Bind resize event
        this.bindResize();

        this.eventcolours = {
            "#FF5E3A": false,
            "#099e12": false,
            "#1D62F0": false,
            "#FF2D55": false,
            "#8E8E93": false,
            "#0b498c": false,
            "#34AADC": false,
            "#5AD427": false
        };

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


    _createClass(Calendar, [{
        key: "initializeTooltips",
        value: function initializeTooltips() {
            // Initialize prev/next sched tooltips
            $("#prevSchedule").tooltip();
            $("#nextSchedule").tooltip();

            // Initialize left side button tooltips
            $("#dlSchedulePhoto").tooltip();
            $("#removeBlockedTimes").tooltip();
            $("#copySchedToClipboard").tooltip();
            $("#shareToFacebook").tooltip();
            $("#uploadToImgur").tooltip();
        }

        /*
            Binds an event handler to redraw the current schedule when the window is resized (since the event sizes will change)
              Waits for 500ms since the latest resize event
        */

    }, {
        key: "bindResize",
        value: function bindResize() {
            var self = this;
            var resizeTimer;

            $(window).resize(function () {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(function () {
                    self.redrawSchedule();
                }, 500);
            });
        }

        /*
            Binds the Schedule Photo Download button and implements the DL functionality
        */

    }, {
        key: "bindSchedulePhotoDL",
        value: function bindSchedulePhotoDL() {
            var self = this;

            // on click
            $("#dlSchedulePhoto").click(function () {
                // Take the screenshot
                self.takeCalendarHighResScreenshot(1.6, 2, function (canvas) {
                    // Download the picture
                    var a = document.createElement('a');
                    a.href = canvas.replace("image/png", "image/octet-stream");

                    // Set the name of the file
                    if (window.uni != null && window.term != null) a.download = window.uni + '_' + window.term + '_ScheduleStorm.png';else a.download = 'ScheduleStorm_Schedule.png';

                    // Append it to the body
                    document.body.appendChild(a);

                    a.click();

                    // Remove it from the body
                    document.body.removeChild(a);
                });
            });
        }

        /*
            Binds the imgur button to upload a photo of the schedule to imgur and open it
        */

    }, {
        key: "bindImgurUpload",
        value: function bindImgurUpload() {
            var self = this;

            $("#uploadToImgur").click(function () {
                /*
                    Why do we make a separate window/tab now?
                      If we simply open up a new window/tab after we already have the photo uploaded
                    and the imgur link, we lose the "trusted" event that came from a user click. 
                    As a result, the window/tab would be blocked as a popup. If we create the window
                    now while we have a trusted event and then change its location when we're ready, 
                    we can bypass this.
                */
                var imgurwindow = window.open("http://schedulestorm.com/assets/imgurloading.png", 'Uploading to Imgur...', "width=900,height=500");

                // Upload the image to imgur and get the link
                self.uploadToImgur(1.5, function (link) {
                    if (link != false) {
                        imgurwindow.location.href = link + ".png";
                    } else {
                        // There was an error, show the error screen
                        imgurwindow.location.href = "http://schedulestorm.com/assets/imgurerror.png";
                    }
                });
            });
        }

        /*
            Uploads the current schedule to imgur and returns the URL if successful
            If not, returns false
        */

    }, {
        key: "uploadToImgur",
        value: function uploadToImgur(ratio, cb) {
            var self = this;

            // Takes a screenshot of the calendar
            self.takeCalendarHighResScreenshot(ratio, 2, function (canvas) {
                // Send AJAX request to imgur with the photo to upload
                $.ajax({
                    url: 'https://api.imgur.com/3/image',
                    type: 'POST',
                    headers: {
                        Authorization: 'Client-ID 9bdb3669a12eeb2'
                    },
                    data: {
                        type: 'base64',
                        name: 'schedulestorm.png',
                        title: 'Schedule Storm',
                        description: "Made using ScheduleStorm.com for " + window.unis[window.uni]["name"] + " - " + window.unis[window.uni]["terms"][window.term],
                        image: canvas.split(',')[1]
                    },
                    dataType: 'json'
                }).success(function (data) {
                    cb(data.data.link);
                }).error(function () {
                    cb(false);
                });
            });
        }

        /*
            Binds the Facebook share button to actually share on click
        */

    }, {
        key: "bindFacebookSharing",
        value: function bindFacebookSharing() {
            var self = this;

            $("#shareToFacebook").click(function () {
                // We have to preserve this "trusted" event and thus have to make the window now
                var facebookwindow = window.open("http://schedulestorm.com/assets/facebookshare.png", 'Sharing to Facebook...', "width=575,height=592");

                self.uploadToImgur(1.91, function (link) {
                    // Set the default image if no image
                    if (link == false) {
                        link = "https://camo.githubusercontent.com/ac09e7e7a60799733396a0f4d496d7be8116c542/687474703a2f2f692e696d6775722e636f6d2f5a425258656d342e706e67";
                    }

                    var url = self.generateFacebookFeedURL(link);
                    facebookwindow.location.href = url;
                });
            });
        }

        /*
            Generates the URL to use to share this schedule to Facebook
        */

    }, {
        key: "generateFacebookFeedURL",
        value: function generateFacebookFeedURL(picture) {

            var url = "https://www.facebook.com/v2.8/dialog/feed";
            var parameters = {
                "app_id": "138997789901870",
                "caption": "University Student Schedule Generator",
                "display": "popup",
                "e2e": "{}",
                "link": "http://schedulestorm.com",
                "locale": "en_US",
                "name": "Schedule Storm",
                "domain": "schedulestorm.com",
                "relation": "opener",
                "result": '"xxRESULTTOKENxx"',
                "sdk": "joey",
                "version": "v2.8"
            };
            var index = 0;

            for (var parameter in parameters) {
                if (index > 0) url += "&";else url += "?";

                url += parameter + "=" + encodeURIComponent(parameters[parameter]);
                index += 1;
            }

            url += "&description=" + encodeURIComponent(this.generateFacebookDescription(this.currentSchedule));
            url += "&picture=" + encodeURIComponent(picture);

            return url;
        }

        /*
            Generates the Facebook description text given a schedule
        */

    }, {
        key: "generateFacebookDescription",
        value: function generateFacebookDescription(schedule) {
            var returnText = window.unis[window.uni]["name"] + " - " + window.unis[window.uni]["terms"][window.term];

            // Make sure we actully have a possible schedule
            if (schedule.length > 0) {
                returnText += " --- Classes: ";

                var coursesdict = {};

                // Iterate through each class and populate the return Text
                for (var classv in schedule) {
                    var thisclass = schedule[classv];
                    if ((typeof thisclass === "undefined" ? "undefined" : _typeof(thisclass)) == "object") {

                        if (coursesdict[thisclass["name"]] == undefined) {
                            coursesdict[thisclass["name"]] = [];
                        }

                        coursesdict[thisclass["name"]].push(thisclass["id"]);
                    }
                }

                // Iterate through the dict keys and add the values to the returnText
                var keylength = Object.keys(coursesdict).length;
                var index = 0;
                for (var key in coursesdict) {
                    index += 1;
                    returnText += key + " (" + coursesdict[key] + ")";

                    if (index < keylength) {
                        returnText += ", ";
                    }
                }
            }

            return returnText;
        }

        /*
            Takes a high-res screenshot of the calendar with the specified aspect ratio and downloads it as a png to the system
              Thanks to: https://github.com/niklasvh/html2canvas/issues/241#issuecomment-247705673
        */

    }, {
        key: "takeCalendarHighResScreenshot",
        value: function takeCalendarHighResScreenshot(aspectratio, scaleFactor, cb) {
            var self = this;

            var srcEl = document.getElementById("maincalendar");

            var wrapdiv = $(srcEl).find('.wrap');

            var beforeHeight = wrapdiv.height();

            // Want to remove any scrollbars
            wrapdiv.removeClass('wrap');

            // If removing the size caused the rows to be smaller, add the class again
            if (beforeHeight > wrapdiv.height()) {
                wrapdiv.addClass('wrap');
            }

            // Save original size of element
            var originalWidth = srcEl.offsetWidth;
            var originalHeight = wrapdiv.height() + $(srcEl).find("table").eq(0).height();

            // see if we can scale the width for it to look right for the aspect ratio
            if (originalHeight * aspectratio <= $(window).width()) {
                originalWidth = originalHeight * aspectratio;
            }

            // Force px size (no %, EMs, etc)
            srcEl.style.width = originalWidth + "px";
            srcEl.style.height = originalHeight + "px";

            // Position the element at the top left of the document because of bugs in html2canvas.
            // See html2canvas issues #790, #820, #893, #922
            srcEl.style.position = "fixed";
            srcEl.style.top = "0";
            srcEl.style.left = "0";

            // Create scaled canvas
            var scaledCanvas = document.createElement("canvas");
            scaledCanvas.width = originalWidth * scaleFactor;
            scaledCanvas.height = originalHeight * scaleFactor;
            scaledCanvas.style.width = originalWidth + "px";
            scaledCanvas.style.height = originalHeight + "px";
            var scaledContext = scaledCanvas.getContext("2d");
            scaledContext.scale(scaleFactor, scaleFactor);

            // Force the schedule to be redrawn
            this.redrawSchedule();

            html2canvas(srcEl, { canvas: scaledCanvas }).then(function (canvas) {

                // Reset the styling of the source element
                srcEl.style.position = "";
                srcEl.style.top = "";
                srcEl.style.left = "";
                srcEl.style.width = "";
                srcEl.style.height = "";

                wrapdiv.addClass('wrap');

                self.redrawSchedule();

                // return the data
                cb(canvas.toDataURL("image/png"));
            });
        }
    }, {
        key: "bindRemoveBlockedTimes",


        /*
            Binds button that allows you to remove all blocked times
        */
        value: function bindRemoveBlockedTimes() {
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
            });
        }

        /*
            Binds the copy schedule to clipboard button
        */

    }, {
        key: "bindCopyScheduleToClipboard",
        value: function bindCopyScheduleToClipboard() {
            var self = this;

            self.copyschedclipboard = new Clipboard('#copySchedToClipboard', {
                text: function text(trigger) {
                    return self.generateScheduleText(self.currentSchedule);
                }
            });
        }

        /*
            Visually removes all blocked times from the Schedule UI
        */

    }, {
        key: "removeAllBlockedTimeUI",
        value: function removeAllBlockedTimeUI() {
            $(".calendar").find(".blockedTime").toggleClass("blockedTime");
        }

        /*
            Starts loading animation
        */

    }, {
        key: "startLoading",
        value: function startLoading(message) {
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

    }, {
        key: "doneLoading",
        value: function doneLoading(cb) {
            var self = this;
            self.loadingcb = cb;

            if (self.isLoading) {
                self.loading.remove(function () {
                    self.isLoading = false;
                    self.loadingcb();
                });
            } else {
                self.isLoading = false;
                cb();
            }
        }

        /*
            Sets loading status of the animation
        */

    }, {
        key: "setLoadingStatus",
        value: function setLoadingStatus(message) {
            this.loading.setStatus(message);
        }

        /*
            Empties out the calendar
        */

    }, {
        key: "emptyCalendar",
        value: function emptyCalendar() {
            $("#schedule").find(".outer:first").empty();
        }

        /*
            Sets the calendar status to the defined text
        */

    }, {
        key: "setCalendarStatus",
        value: function setCalendarStatus(text) {
            $("#schedule").find("#calendarStatus").text(text);
        }

        /*
            Resets the calendar status to an empty string
        */

    }, {
        key: "resetCalendarStatus",
        value: function resetCalendarStatus() {
            this.setCalendarStatus("");
        }

        /*
            Displays the given schedule
        */

    }, {
        key: "displaySchedule",
        value: function displaySchedule(schedule) {
            var self = this;

            // set the score
            // make sure its a number
            if (typeof schedule[0] == "number") $("#scheduleScore").text(schedule[0].toFixed(2));

            // Destroy all the tooltips from previous events
            self.destroyEventTooltips();

            // Clear all the current events on the calendar
            self.clearEvents();

            console.log("This schedule");
            console.log(schedule);

            self.currentSchedule = schedule;

            self.setScheduleConstraints(schedule);

            for (var classv in schedule) {
                var thisclass = schedule[classv];

                var text = thisclass["name"] + " - " + thisclass["type"] + " - " + thisclass["id"];

                // for every time
                for (var time in thisclass["times"]) {
                    var thistime = thisclass["times"][time];

                    // make sure there isn't a -1 in the days
                    if (thistime[0].indexOf(-1) == -1) {
                        this.addEvent(Generator.totalMinutesToTime(thistime[1][0]), Generator.totalMinutesToTime(thistime[1][1]), thistime[0], text, thisclass);
                    }
                }
            }

            // reset the colour ids
            self.resetColours();
        }

        /*
            Redraws the current schedule
        */

    }, {
        key: "redrawSchedule",
        value: function redrawSchedule() {
            if (this.currentSchedule.length > 0) {
                this.displaySchedule(this.currentSchedule);
            }
        }

        /*
            Destroys every currently displayed event tooltip
        */

    }, {
        key: "destroyEventTooltips",
        value: function destroyEventTooltips() {
            // Destroy the tooltips
            $("#schedule").find('.event').each(function (index) {
                $(this).tooltip('destroy');
            });

            // Remove any open tooltip div
            $('[role=tooltip]').each(function (index) {
                $(this).remove();
            });
        }

        /*
            Returns copy-paste schedule text
        */

    }, {
        key: "generateScheduleText",
        value: function generateScheduleText(schedule) {
            var returnText = "Generated by ScheduleStorm.com for " + window.unis[window.uni]["name"] + " " + window.unis[window.uni]["terms"][window.term] + "\n\n";

            var allowedAttributes = ["id", "name", "type", "rooms", "teachers", "times", "section"];

            if (schedule.length > 0) {
                // Iterate through each class and populate the return Text
                for (var classv in schedule) {
                    var thisclass = schedule[classv];

                    var thisrow = "";

                    // Make sure this is a class object
                    if (typeof thisclass != "number") {

                        // Fill up the row with the correct formatting and order of attributes
                        if (thisclass["id"] != undefined) thisrow += thisclass["id"] + " | ";

                        if (thisclass["name"] != undefined) thisrow += thisclass["name"] + " | ";

                        if (thisclass["section"] != undefined) {
                            thisrow += thisclass["type"] + "-" + thisclass["section"] + " (" + thisclass["id"] + ")" + " | ";
                        } else if (thisclass["group"] != undefined) {
                            thisrow += thisclass["type"] + "-" + thisclass["group"] + " (" + thisclass["id"] + ")" + " | ";
                        }

                        thisrow += thisclass["teachers"] + " | ";
                        thisrow += thisclass["rooms"] + " | ";
                        thisrow += thisclass["oldtimes"] + " | ";
                        thisrow += thisclass["status"];
                    }

                    // Add the row if it was actually populated
                    if (thisrow != "") returnText += thisrow + "\n";
                }
            } else {
                returnText += "There were no possible schedules generated :(";
            }

            return returnText;
        }

        /*
            Resets the allocation of colours to each class
        */

    }, {
        key: "resetColours",
        value: function resetColours() {
            for (var colour in this.eventcolours) {
                this.eventcolours[colour] = false;
            }
        }

        /*
            Given a classname, returns the div bg colour
        */

    }, {
        key: "getEventColour",
        value: function getEventColour(classname) {
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

    }, {
        key: "setScheduleConstraints",
        value: function setScheduleConstraints(schedule) {
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
                        var startHour = parseInt(startTime.split(":")[0]);

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

            if (maxDay == 4 && minDay == 0 && minHour == 24 && maxHour == 0) {
                // Just set a default scale
                this.resizeCalendarNoScroll(0, 4, 9, 17);
            } else {
                this.resizeCalendarNoScroll(minDay, maxDay, minHour, maxHour);
            }
        }

        /*
            Sets the current generated index
        */

    }, {
        key: "setCurrentIndex",
        value: function setCurrentIndex(index) {
            var self = this;

            if (index > self.totalGenerated - 1) {
                // go down to the start at 0
                index = 0;
            }
            if (index < 0) {
                // go to the max index
                index = self.totalGenerated - 1;
            }

            self.curIndex = index;

            // show it on the UI
            self.updateIndexUI(self.curIndex + 1);
        }

        /*
            Updates the UI with the passed in current schedule index
        */

    }, {
        key: "updateIndexUI",
        value: function updateIndexUI(index) {
            $("#curGenIndex").text(index);
        }

        /*
            Updates the UI with the passed in total generated schedules
        */

    }, {
        key: "updateTotalUI",
        value: function updateTotalUI(total) {
            $("#totalGen").text(total);
        }

        /*
            Sets the total amount of generated schedules for the UI
        */

    }, {
        key: "setTotalGenerated",
        value: function setTotalGenerated(total) {
            var self = this;

            self.totalGenerated = total;

            self.updateTotalUI(self.totalGenerated);
        }

        /*
            Goes to the previous schedule
        */

    }, {
        key: "goToPrev",
        value: function goToPrev() {
            var self = this;

            if (self.totalGenerated > 0) {
                self.setCurrentIndex(self.curIndex - 1);

                // get the schedule
                var newschedules = window.mycourses.generator.getSchedule(self.curIndex);

                if (newschedules != false) {
                    // we got the schedule, now populate it
                    self.displaySchedule(newschedules);
                }
            }
        }

        /*
            Goes to the next schedule
        */

    }, {
        key: "goToNext",
        value: function goToNext() {
            var self = this;

            if (self.totalGenerated > 0) {
                self.setCurrentIndex(self.curIndex + 1);

                // get the schedule
                var newschedules = window.mycourses.generator.getSchedule(self.curIndex);

                if (newschedules != false) {
                    // we got the schedule, now populate it
                    self.displaySchedule(newschedules);
                }
            }
        }

        /*
            Binds the buttons that let you go through each generated schedule
        */

    }, {
        key: "bindNextPrev",
        value: function bindNextPrev() {
            var self = this;
            // unbind any current binds
            $("#prevSchedule").unbind();
            $("#nextSchedule").unbind();

            $("#prevSchedule").click(function () {
                self.goToPrev();
            });

            $("#nextSchedule").click(function () {
                self.goToNext();
            });
        }

        /*
            Binds the arrow keys and Ctrl+C
        */

    }, {
        key: "keyBinds",
        value: function keyBinds() {
            var self = this;

            // Bind arrow keys
            $(document).on('keydown', function (e) {
                var tag = e.target.tagName.toLowerCase();

                // We don't want to do anything if they have an input focused
                if (tag != "input") {
                    if (e.keyCode == 37) self.goToPrev();else if (e.keyCode == 39) self.goToNext();else if (e.keyCode == 67 && (e.metaKey || e.ctrlKey)) $("#copySchedToClipboard").click();
                }
            });
        }

        /*
            Visually clears all of the events on the calendar
        */

    }, {
        key: "clearEvents",
        value: function clearEvents() {
            $("#schedule").find(".event").each(function () {
                $(this).remove();
            });
        }

        /*
            Generates the HTML for a calendar event tooltip given a class object
        */

    }, {
        key: "generateTooltip",
        value: function generateTooltip(classobj) {
            // Return html string
            var htmlString = "";

            // Define the attributes and their names to add
            var allowedAttributes = [{
                "id": "id",
                "name": "Class ID"
            }, {
                "id": "teachers",
                "name": "Teachers"
            }, {
                "id": "oldtimes",
                "name": "Times"
            }, {
                "id": "rooms",
                "name": "Rooms"
            }, {
                "id": "location",
                "name": "Location"
            }, {
                "id": "scheduletype",
                "name": "Type"
            }, {
                "id": "status",
                "name": "Status"
            }];

            // Iterate through every attribute
            for (var attribute in allowedAttributes) {
                attribute = allowedAttributes[attribute];

                // Make sure its id is defined in the class
                if (classobj[attribute["id"]] != undefined) {
                    if (_typeof(classobj[attribute["id"]]) != "object") {
                        htmlString += "<b style='font-weight: bold;'>" + attribute["name"] + "</b>: " + classobj[attribute["id"]] + "<br>";
                    } else {
                        // Prevent dupes
                        var alreadyAdded = [];

                        // Iterate through the elements and add them
                        htmlString += "<b style='font-weight: bold;'>" + attribute["name"] + "</b>: <br>";
                        for (var index in classobj[attribute["id"]]) {

                            // Check if we've already added this element
                            if (alreadyAdded.indexOf(classobj[attribute["id"]][index]) == -1) {
                                // we haven't already added this element

                                if (attribute["id"] == "teachers") {
                                    var thisteacher = classobj[attribute["id"]][index];

                                    htmlString += thisteacher;

                                    // If this teacher has an RMP score, add it
                                    if (classList.rmpdata[thisteacher] != undefined && classList.rmpdata[thisteacher]["rating"] != undefined) {
                                        htmlString += " (" + classList.rmpdata[thisteacher]["rating"] + ")";
                                    }

                                    htmlString += "<br>";
                                } else {
                                    // Just add the element
                                    htmlString += classobj[attribute["id"]][index] + "<br>";
                                }

                                // push it to added elements
                                alreadyAdded.push(classobj[attribute["id"]][index]);
                            }
                        }
                    }
                }
            }

            return htmlString;
        }

        /*
            Add an event with start and end time (24 hours)
              Days is an array containing the integers that represent the days that this event is on
        */

    }, {
        key: "addEvent",
        value: function addEvent(starttime, endtime, days, text, classobj) {

            var rowheight = $("#schedule").find("td:first").height() + 1;

            var starthour = parseInt(starttime.split(":")[0]);
            var startmin = parseInt(starttime.split(":")[1]);

            var endhour = parseInt(endtime.split(":")[0]);
            var endmin = parseInt(endtime.split(":")[1]);

            // round down to closest 30min or hour
            var roundedstartmin = Math.floor(startmin / 30) * 30;

            // figure out how many minutes are in between the two times
            var totalstartmin = starthour * 60 + startmin;
            var totalendmin = endhour * 60 + endmin;

            var totalmin = totalendmin - totalstartmin;

            // Calculate the height of the box
            var totalheight = 0;

            // Every 30min is rowheight
            totalheight += totalmin / 30 * rowheight;

            // calculate how far from the top the element is
            var topoffset = startmin % 30 / 30 * rowheight;

            // draw the events
            for (var day in days) {
                day = days[day];

                // find the parent
                var tdelement = $("#schedule").find("#" + starthour + "-" + roundedstartmin);
                tdelement = tdelement.find("td:eq(" + (day + 1) + ")");

                // empty it
                tdelement.empty();

                // create the element and append it
                var html = '<div class="event" style="height: ' + totalheight + 'px; top: ' + topoffset + 'px; background: ' + this.getEventColour(classobj["name"]) + ';" data-toggle="tooltip" title="' + this.generateTooltip(classobj) + '">';

                html += text;

                html += '</div>';

                // Initialize the tooltip
                html = $(html).tooltip({ container: 'body', html: true });

                tdelement.append(html);
            }
        }

        /*
            Resizes the calendar to the specified constraints
        */

    }, {
        key: "resizeCalendarNoScroll",
        value: function resizeCalendarNoScroll(startDay, endDay, startHour, endHour) {

            // If the difference between the start and end hours is less than 6, extend the end hour
            // This is to make sure the appearance of the calendar doesn't look weird and
            // that every row is 20px high

            var self = this;

            if (endHour - startHour < 6) {
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
            var hour = startHour - 1; // 24 hour

            while (hour < endHour) {

                if (min >= 60) {
                    min = 0;
                    hour += 1;
                }

                // find 12 hour equivalent
                var hours12 = (hour + 11) % 12 + 1;

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
                } else {
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
                    } else if (self.removeTimes == false && self.blockedTimes[thisday].indexOf(thistime) == -1) {
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

    }, {
        key: "displayBlockedTimes",
        value: function displayBlockedTimes() {
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

                        var totalMin = parseInt(thistime.split("-")[0]) * 60 + parseInt(thistime.split("-")[1]);

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
                this.resizeCalendarNoScroll(minDay, maxDay, Math.floor(minTime / 60), Math.floor(maxTime / 60) + 1);
            }
        }

        /*
            Resets the calendar (removes timeblocks and current schedules)
        */

    }, {
        key: "resetCalendar",
        value: function resetCalendar() {
            this.blockedTimes = [];
            this.prevBlockedTimes = [];
            this.currentSchedule = [];

            this.setTotalGenerated(0);
            this.setCurrentIndex(-1);

            this.resizeCalendarNoScroll(0, 4, 9, 17);
        }
    }]);

    return Calendar;
}();
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ClassList = function () {
    function ClassList(uni, term) {
        _classCallCheck(this, ClassList);

        this.baseURL = "http://api.schedulestorm.com:5000/v1/";
        this.detailKeys = ["prereq", "coreq", "antireq", "notes"];
        this.uni = uni;
        this.term = term;
        this.location = null;
        window.term = term;
        window.uni = uni;

        // we want to save the term and uni in localstorage
        localStorage.setItem('uni', uni);
        localStorage.setItem('term', term);

        this.searchFound = []; // Array that sorts search results by order of importance

        $("#searchcourses").unbind(); // unbind search if there is a bind

        this.createTermDropdown();
        this.createLocationDropdown();
        this.getClasses();
    }

    /*
        Populates the term selector dropdown beside the search bar
    */


    _createClass(ClassList, [{
        key: "createTermDropdown",
        value: function createTermDropdown() {
            var self = this;

            $("#termselectdropdown").empty();

            // set our current term
            $("#termselect").html(window.unis[this.uni]["terms"][this.term] + ' <img src="assets/arrow.png">');

            // populate the terms
            for (var term in window.unis[this.uni]["terms"]) {
                var html = $('<li><a term="' + term + '">' + window.unis[this.uni]["terms"][term] + '</a></li>');

                html.click(function () {
                    // check if they changed terms
                    var newterm = $(this).find("a").attr("term");
                    if (newterm != self.term) {
                        // This is a new term, reinstantiate the object so we can show the new results
                        window.classList = new ClassList(self.uni, newterm);
                        window.mycourses = new MyCourses(self.uni, newterm);

                        // reset the calendar
                        window.calendar.resetCalendar();
                    }
                });

                $("#termselectdropdown").append(html);
            }
        }

        /*
            Populates the location dropdown
        */

    }, {
        key: "createLocationDropdown",
        value: function createLocationDropdown() {
            var self = this;

            $("#locationselectdropdown").empty();

            // Set the default value
            $("#locationselect").html('All Locations <img src="assets/arrow.png">');

            // Create and bind the all locations option in the dropdown
            var alllochtml = $('<li><a location="all">All Locations</a></li>');

            // Bind the click event
            alllochtml.click(function () {
                // Only update if there was a change
                if (self.location != null) {
                    self.location = null;
                    $("#locationselect").html('All Locations <img src="assets/arrow.png">');

                    // Get the original class data with all info
                    self.classdata = JSON.parse(self.stringClassData);

                    // Slide up the classdata div
                    $("#classdata").slideUp(function () {
                        // empty it
                        $("#classdata").empty();

                        // populate the classdata with the original class data
                        self.populateClassList([self.classdata], $("#classdata"), "");
                    });
                }
            });

            // Append it to the dropdown
            $("#locationselectdropdown").append(alllochtml);

            // Add a divider
            $("#locationselectdropdown").append('<li role="separator" class="divider"></li>');

            // Append every location to the dropdown for this uni
            for (var location in window.unis[self.uni]["locations"]) {
                var thislocation = window.unis[self.uni]["locations"][location];

                // Create the HTML
                var html = $('<li><a location="' + thislocation + '">' + thislocation + '</a></li>');

                // Bind the click event
                html.click(function () {
                    // check if they changed locations
                    var newlocation = $(this).find("a").attr("location");

                    if (newlocation != self.location) {
                        self.location = newlocation;
                        $("#locationselect").html(newlocation + ' <img src="assets/arrow.png">');

                        // Update the classlist
                        self.updateLocation(self.location);
                    }
                });

                // Append this to the dropdown
                $("#locationselectdropdown").append(html);
            }
        }

        /*
            Updates the classlist to only include the specified locations
        */

    }, {
        key: "updateLocation",
        value: function updateLocation(newlocation) {
            var self = this;

            // Get the original class data with all info
            self.classdata = JSON.parse(self.stringClassData);

            // Prune out children that don't have relevant locations
            self.pruneLocations("", "", self.classdata, newlocation);

            // Slide up the class data
            $("#classdata").slideUp(function () {
                // Empty it
                $("#classdata").empty();

                // If we found results, populate it
                if (Object.keys(self.classdata).length > 0) {
                    self.populateClassList([self.classdata], $("#classdata"), "");
                } else {
                    // We didn't find any matches
                    $("#classdata").text("There are no courses with that location :(").slideDown();
                }
            });
        }

        /*
            Recursive function that prunes out branches that don't have a relevant location within them
        */

    }, {
        key: "pruneLocations",
        value: function pruneLocations(parent, parentkey, data, location) {
            var self = this;

            // Check if this is a class
            if (data["classes"] != null) {
                // Boolean as to whether we've found a class with a relevant location
                var foundLocation = false;

                // array that contains the classes that have the location
                var includesLocations = [];

                for (var classv in data["classes"]) {
                    var thisclass = data["classes"][classv];

                    if (thisclass["location"] == location) {
                        foundLocation = true;
                        includesLocations.push(thisclass);
                    }
                }

                // overwrite the classes
                data["classes"] = includesLocations;

                if (foundLocation == false) {
                    // tell the parent to delete themselves if other branches aren't fruitfull
                    return true;
                } else {
                    return false;
                }
            } else {
                var deleteThis = true;

                // For every key in this data
                for (var key in data) {
                    if (key != "description") {
                        // Get this data
                        var thisdata = data[key];

                        // Call this function on the child and see if they have any children with a relevant location
                        if (self.pruneLocations(data, key, thisdata, location) == false) {
                            deleteThis = false;
                        } else {
                            // No child has a relevant location, remove this branch
                            delete data[key];
                        }
                    }
                }

                if (deleteThis == true) {
                    // Remove this parent branch
                    delete parent[parentkey];

                    // tell any parents that this branch doesn't have a match
                    return true;
                } else {
                    return false;
                }
            }
        }

        /*
            Retrieves the class list and populates the classes accordion
        */

    }, {
        key: "getClasses",
        value: function getClasses() {
            var self = this;

            $("#classdata").fadeOut(function () {
                $("#classdata").empty();

                // Remove any current loading animations for courses
                $("#courseSelector").find("#loading").remove();

                // Add loading animation
                var loading = new Loading($("#CourseDataLoader"), "Loading Course Data...");

                // Get the class data
                $.getJSON(self.baseURL + "unis/" + self.uni + "/" + self.term + "/all", function (data) {
                    self.classdata = data["classes"];
                    self.rmpdata = data["rmp"];

                    // Make a saved string copy for future purposes if they change locations
                    self.stringClassData = JSON.stringify(self.classdata);

                    // Find the RMP average
                    self.findRMPAverage(self.rmpdata);

                    loading.remove(function () {
                        // We want to make sure the user hasn't chosen a new term while this one was loading
                        if (self.uni == window.uni && self.term == window.term) {
                            // In case the user spammed different terms while loading

                            // let mycourses load any saved states
                            window.mycourses.loadState();

                            // Create the tutorial obj
                            var thistut = new Tutorial();

                            // Empty out the div
                            $("#classdata").empty();

                            // Remove the loading animation and populate the list
                            self.populateClassList([data["classes"]], $("#classdata"), "");
                            self.bindSearch();
                        }
                    });
                });
            });
        }

        /*
            Sets the average of the passed in RMP data
        */

    }, {
        key: "findRMPAverage",
        value: function findRMPAverage(rmpdata) {
            var self = this;

            var totalratings = 0;
            var numratings = 0;

            for (var teacher in rmpdata) {
                var thisteacher = rmpdata[teacher];

                if (thisteacher["rating"] != undefined) {
                    totalratings += thisteacher["rating"];
                    numratings += 1;
                }
            }

            if (numratings == 0) {
                // This term has no ratings
                self.rmpavg = 2.5;
            } else {
                self.rmpavg = totalratings / numratings;
            }
        }

        /*
            Generates a class descriptions (details button contents)
        */

    }, {
        key: "generateClassDesc",
        value: function generateClassDesc(desc) {
            var html = '<div class="accordiondesc">';

            var append_amt = 0;

            if (desc["aka"] != undefined) {
                html += "AKA: " + desc["aka"] + "<br>";
                append_amt += 1;
            }
            if (desc["desc"] != undefined) {
                html += desc["desc"] + "<br><br>";
                append_amt += 1;
            }

            if (desc["units"] != undefined) {
                html += desc["units"] + " units; ";
                append_amt += 1;

                if (desc["hours"] == undefined) {
                    html += "<br>";
                }
            }

            if (desc["hours"] != undefined) {
                html += desc["hours"] + "<br>";
                append_amt += 1;
            }

            if (append_amt == 0) return "";else return html;
        }

        /*
            Generates class details button
        */

    }, {
        key: "generateClassDetails",
        value: function generateClassDetails(element, path) {
            var self = this;

            var button = $(this.generateAccordionHTML("Details", path + "\\description", "accordionDetailButton"));

            button.find("label").click(function () {
                self.bindButton(self.classdata, this, "detail");
            });

            element.append(button);
        }

        /*
            Populates class details
        */

    }, {
        key: "populateClassDetails",
        value: function populateClassDetails(data, element) {
            var html = '<div class="accordiondesc accordiondetail">';

            var detailIndex = 0;
            for (var detail in this.detailKeys) {
                var detail = this.detailKeys[detail];

                if (data[detail] != undefined) {
                    // Capitalize the first letter of the key
                    var capitalDetail = detail.charAt(0).toUpperCase() + detail.slice(1);

                    // Proper spacing
                    if (detailIndex > 0) {
                        html += "<br><br>";
                    }
                    html += capitalDetail + ": " + data[detail];

                    detailIndex += 1;
                }
            }
            element.append(html);

            element.slideDown();
        }

        /*
            Abbreviates the given times by shortening day codes and spaces
        */

    }, {
        key: "generateRMPLink",


        /*
            Returns an RMP link with the data being the rating
        */
        value: function generateRMPLink(rmpdata, teacher) {
            var text = "(N/A)";

            if (rmpdata["rating"] != undefined) {
                text = "(" + rmpdata["rating"] + ")";
            }

            if (rmpdata["id"] == undefined) return text;else {
                return "<a href='https://www.ratemyprofessors.com/ShowRatings.jsp?tid=" + rmpdata["id"] + "' target='_blank' class='rmplink' rmpteacher='" + teacher + "'>" + text + "</a>";
            }
        }

        /*
            Returns the tooltip html
        */

    }, {
        key: "generateRMPTooltipHTML",
        value: function generateRMPTooltipHTML(rmpdata) {
            var html = "<b style='font-weight: bold; font-size: 14px;'>Rate My Professors</b><br>";

            var allowedAttributes = [{
                "id": "department",
                "name": "Department"
            }, {
                "id": "rating",
                "name": "Rating"
            }, {
                "id": "easyrating",
                "name": "Difficulty"
            }, {
                "id": "numratings",
                "name": "Number of Ratings"
            }, {
                "id": "rooms",
                "name": "Rooms"
            }];

            for (var attribute in allowedAttributes) {
                attribute = allowedAttributes[attribute];

                // Make sure its id is defined
                if (rmpdata[attribute["id"]] != undefined) {
                    html += "<b style='font-weight: bold;'>" + attribute["name"] + "</b>: " + rmpdata[attribute["id"]] + "<br>";
                }
            }

            return html;
        }

        /*
            Populates a list of given clases
        */

    }, {
        key: "generateClasses",
        value: function generateClasses(data, element, path, addButton) {
            var self = this;

            // clone the data since we're going to modify it
            data = JSON.parse(JSON.stringify(data));

            var html = $("<div class='accordiontableparent'><table class='table accordiontable'><tbody></tbody></table></div>");

            // Array that stores the ordered classes
            var orderedClasses = [];

            // Order to use
            var typeOrder = ["LEC", "LCL", "SEM", "LAB", "LBL", "CLN", "TUT"];

            var engineerFlag = preferences.getEngineeringValue();

            // Order the classes
            for (var type in typeOrder) {

                var nonPushedClasses = [];

                type = typeOrder[type];

                // Go through each class and if it has the same type, add it
                for (var index = 0; index < data["classes"].length; index++) {
                    var thisclass = data["classes"][index];

                    // If this student is at U of A and they aren't an engineer, don't display engineering classes
                    if (self.uni === 'UAlberta' && Number(self.term) % 10 === 0 && engineerFlag === false) {
                        if (thisclass['section'][1].match(/[a-z]/i) === null) {
                            if (thisclass["type"] == type) {
                                // add to the ordered classes
                                orderedClasses.push(thisclass);
                            } else {
                                // push it to the classes that haven't been pushed yet
                                nonPushedClasses.push(thisclass);
                            }
                        }
                    } else {
                        if (thisclass["type"] == type) {
                            // add to the ordered classes
                            orderedClasses.push(thisclass);
                        } else {
                            // push it to the classes that haven't been pushed yet
                            nonPushedClasses.push(thisclass);
                        }
                    }
                }

                data["classes"] = nonPushedClasses;
            }

            // Add the rest of the classes that weren't matched
            for (var index = 0; index < data["classes"].length; index++) {
                var thisclass = data["classes"][index];
                // add to the ordered classes
                orderedClasses.push(thisclass);
            }

            for (var index = 0; index < orderedClasses.length; index++) {

                var thishtml = "<tr>";

                var thisclass = orderedClasses[index];

                // Show the section data if we can, otherwise default to group
                if (thisclass["section"] != undefined) var id = thisclass["type"] + "-" + thisclass["section"] + " (" + thisclass["id"] + ")";else var id = thisclass["type"] + "-" + thisclass["group"] + " (" + thisclass["id"] + ")";

                thishtml += "<td style='width: 18%;'>" + id + "</td>";

                var teachers = "";
                var addedTeachers = [];

                for (var teacher in thisclass["teachers"]) {
                    // Check if we've already added this teacher
                    if (addedTeachers.indexOf(thisclass["teachers"][teacher]) == -1) {
                        if (teacher > 0) {
                            teachers += "<br>";
                        }
                        teacher = thisclass["teachers"][teacher];

                        // Add the abbreviated teachers name
                        teachers += ClassList.abbreviateName(teacher);

                        // Add the rmp rating if we can
                        if (this.rmpdata[teacher] != undefined) {
                            teachers += " " + this.generateRMPLink(this.rmpdata[teacher], teacher);
                        }

                        addedTeachers.push(teacher);
                    }
                }

                var timescopy = thisclass["times"].slice();
                var addedTimes = [];

                // we want to reduce the size of the times (Th) and remove dupes
                for (var time in timescopy) {
                    var abbrevTime = ClassList.abbreviateTimes(timescopy[time]);

                    if (addedTimes.indexOf(abbrevTime) == -1) {
                        addedTimes.push(abbrevTime);
                    }
                }

                // Remove duplicates in rooms
                var addedRooms = [];

                for (var room in thisclass["rooms"]) {
                    room = thisclass["rooms"][room];

                    if (addedRooms.indexOf(room) == -1) {
                        addedRooms.push(room);
                    }
                }

                thishtml += "<td style='width: 20%;'>" + teachers + "</td>";

                thishtml += "<td>" + addedRooms.join("<br>") + "</td>";

                thishtml += "<td style='width: 25%;'>" + addedTimes.join("<br>") + "</td>";

                thishtml += "<td style='width: 15%;'>" + thisclass["location"] + "</td>";

                thishtml += "<td>" + thisclass["status"] + "</td>";

                thishtml += "</tr>";

                thishtml = $(thishtml);

                if (addButton) {
                    // check whether we have added this class already
                    if (window.mycourses.hasClass(thisclass["id"]) == true) {
                        self.appendClassRemoveBtn(thisclass["id"], path, thishtml);
                    } else {
                        self.appendClassAddBtn(thisclass["id"], path, thishtml);
                    }
                }

                html.find("tbody").append(thishtml);
            }

            // Add tooltips to the rmp ratings
            html.find('a[rmpteacher]').each(function () {
                var teacher = $(this).attr("rmpteacher");

                // Generate the tooltip text
                var tooltiptext = self.generateRMPTooltipHTML(self.rmpdata[teacher]);

                // Add the attributes to the element
                $(this).attr("title", tooltiptext);
                $(this).attr("data-toggle", "tooltip");

                // Instantiate the tooltip
                $(this).tooltip({ container: 'body', html: true });
            });

            element.append(html);

            return html;
        }

        /*
            Abbreviates a given name
        */

    }, {
        key: "populateClass",


        /*
            Populates a class
        */
        value: function populateClass(data, element, path) {
            if (data["description"] != undefined) {
                element.append(this.generateClassDesc(data["description"]));

                // Does this class have more info we can put in a details button?
                var foundDetails = false;
                for (var detail in this.detailKeys) {
                    detail = this.detailKeys[detail];

                    if (data["description"][detail] != undefined) {
                        foundDetails = true;
                        break;
                    }
                }

                if (foundDetails === true) {
                    // We have data to make a dropdown for
                    this.generateClassDetails(element, path);
                }

                // Populate the class list
                this.generateClasses(data, element, path, true);
            }
        }

        /*
            Does proper DOM manipulation for adding accordion elements
        */

    }, {
        key: "addAccordionDOM",
        value: function addAccordionDOM(data, element, path) {
            var self = this;

            for (var arrayelement in data) {
                // this array is sorted by order of importance of populating the elements
                var thisdata = data[arrayelement];

                if (thisdata != undefined) {
                    for (var val in thisdata) {
                        if (val == "classes") {
                            // This is a class, process it differently
                            self.populateClass(thisdata, element, path);
                        } else if (val != "description") {
                            // Generate this new element, give it the path
                            var thispath = "";
                            if (thisdata[val]["path"] != undefined) {
                                thispath = thisdata[val]["path"];
                            } else {
                                thispath = path + "\\" + val;
                            }

                            var name = val;

                            if (thisdata[val]["description"] != undefined) {
                                if (thisdata[val]["description"]["name"] != undefined) {
                                    name += " - " + thisdata[val]["description"]["name"];
                                }
                            }

                            var thiselement = $(self.generateAccordionHTML(name, thispath));

                            if (thisdata[val]["classes"] != undefined) {

                                // check if the user has already selected this course
                                // if so, put a remove button
                                var subject = thispath.split("\\");

                                var coursenum = subject[subject.length - 1]; // 203
                                var subject = subject[subject.length - 2]; // CPSC

                                var coursecode = subject + " " + coursenum; // CPSC 203

                                if (window.mycourses.hasCourse(coursecode)) {
                                    self.appendCourseRemoveBtn(coursecode, thiselement.find("label"));
                                } else {
                                    self.appendCourseAddBtn(coursecode, thiselement.find("label"));
                                }
                            }

                            thiselement.find("label").click(function (event) {
                                event.stopPropagation();
                                self.bindButton(self.classdata, this, "class");
                            });
                            element.append(thiselement);
                        }
                    }
                }
            }
        }

        /*
            Appends a course add button to the element
        */

    }, {
        key: "appendCourseAddBtn",
        value: function appendCourseAddBtn(coursecode, element) {
            var self = this;

            // this is a label for a course, allow the user to add the general course
            var addbutton = $('<div class="addCourseButton" code="' + coursecode + '">+</div>');

            addbutton.click(function (event) {
                event.stopPropagation();

                // get the path for this course
                var path = $(this).parent().attr("path");
                var splitpath = path.split("\\");

                var coursedata = self.classdata;

                // get the data for this course
                for (var apath in splitpath) {
                    if (splitpath[apath] != "") {
                        coursedata = coursedata[splitpath[apath]];
                    }
                }

                // Add the course to the current active group
                window.mycourses.addCourse(coursedata, path);

                // we want to remove this button and replace it with a remove btn
                var coursecode = $(this).attr("code");

                self.appendCourseRemoveBtn(coursecode, $(this).parent());

                // now remove this old button
                $(this).remove();
            });

            element.append(addbutton);
        }

        /*
            Appends a remove course button to the element
        */

    }, {
        key: "appendCourseRemoveBtn",
        value: function appendCourseRemoveBtn(coursecode, element) {
            var self = this;

            var removebtn = $('<div class="removeCourseButton" code="' + coursecode + '">×</div>');

            removebtn.click(function (event) {
                event.stopPropagation();

                var coursecode = $(this).attr("code");

                // remove the course
                window.mycourses.removeCourse(coursecode);

                // add an "add" button
                self.appendCourseAddBtn(coursecode, $(this).parent());

                // remove this button
                $(this).remove();
            });

            element.append(removebtn);
        }

        /*
            Appends an add class button to the element (table)
        */

    }, {
        key: "appendClassAddBtn",
        value: function appendClassAddBtn(id, path, element) {
            var self = this;

            var button = $('<td><button class="btn btn-default" classid="' + id + '" path="' + path + '">&plus;</button></td>');

            button.find("button").click(function () {
                // get the path for this course
                var path = $(this).attr('path');
                var splitpath = path.split("\\");

                var coursedata = self.classdata;

                // get the data for this course
                for (var apath in splitpath) {
                    if (splitpath[apath] != "") {
                        coursedata = coursedata[splitpath[apath]];
                    }
                }

                window.mycourses.addCourse(coursedata, $(this).attr('path'), $(this).attr('classid'));

                // now add a remove button here
                self.appendClassRemoveBtn($(this).attr('classid'), $(this).attr('path'), $(this).parent().parent());

                $(this).parent().remove();
            });

            // append it to the element
            element.append(button);
        }

        /*
            Appends a class remove button to the specified element
        */

    }, {
        key: "appendClassRemoveBtn",
        value: function appendClassRemoveBtn(id, path, element) {
            var self = this;

            var button = $('<td><button class="btn btn-default" id="removeClassBtn" classid="' + id + '" path="' + path + '">×</button></td>');

            button.find("button").click(function () {
                // get the path for this course
                var path = $(this).attr('path');
                var splitpath = path.split("\\");

                var coursedata = self.classdata;

                // get the data for this course
                for (var apath in splitpath) {
                    if (splitpath[apath] != "") {
                        coursedata = coursedata[splitpath[apath]];
                    }
                }

                window.mycourses.removeClass($(this).attr('classid'));

                self.appendClassAddBtn($(this).attr('classid'), $(this).attr('path'), $(this).parent().parent());

                $(this).parent().remove();
            });

            // append it to the element
            element.append(button);
        }

        /*
            Updates the remove button on a removed course in My Courses
        */

    }, {
        key: "updateRemovedCourse",
        value: function updateRemovedCourse(coursecode) {
            var removedCourse = $("div[code='" + coursecode + "']");
            if (removedCourse.length > 0) {
                var parent = removedCourse.parent();
                this.appendCourseAddBtn(coursecode, removedCourse.parent());
                removedCourse.remove();
            }
        }

        /*
            Updates the add button on an added course in My Courses
        */

    }, {
        key: "updateAddedCourse",
        value: function updateAddedCourse(coursecode) {
            var addedCourse = $("div[code='" + coursecode + "']");
            if (addedCourse.length > 0) {
                var parent = addedCourse.parent();
                this.appendCourseRemoveBtn(coursecode, addedCourse.parent());
                addedCourse.remove();
            }
        }

        /*
            Updates the specified class button if it is visible
        */

    }, {
        key: "updateRemovedClass",
        value: function updateRemovedClass(classid) {
            var removedClass = $("button[classid='" + classid + "']");
            if (removedClass.length > 0) {
                this.appendClassAddBtn(classid, removedClass.attr("path"), removedClass.parent().parent());
                removedClass.parent().remove();
            }
        }

        /*
            Populates the classlist on demand given the hierarchy
        */

    }, {
        key: "populateClassList",
        value: function populateClassList(data, element, path, noanimations) {
            var self = this;

            if (noanimations != true) {
                // Slide up the element
                element.slideUp(function () {
                    self.addAccordionDOM(data, element, path);
                    element.slideDown();
                });
            } else {
                self.addAccordionDOM(data, element, path);
                element.show();
            }
        }

        /*
            Binds an accordion button
        */

    }, {
        key: "bindButton",
        value: function bindButton(classdata, button, type) {
            //console.log(classdata);
            //console.log(button);

            var self = this;
            // Onclick handler

            // do we need to close the element?
            if ($(button).attr("accordopen") == "true") {
                // Close the element
                $(button).attr("accordopen", "false");

                $(button).parent().find("ul").slideUp(function () {
                    $(this).empty();
                });
            } else {
                // Open accordion
                var thispath = $(button).attr("path").split("\\");
                $(button).attr("accordopen", "true");

                // Element to populate
                var element = $(button).parent().find("ul");

                // want to find the data to populate
                var thisdata = classdata;
                for (var key in thispath) {
                    if (key > 0) {
                        thisdata = thisdata[thispath[key]];
                    }
                }

                // Populate the element
                if (type == "class") {
                    self.populateClassList([thisdata], element, $(button).attr("path"));
                } else if (type == "detail") {
                    self.populateClassDetails(thisdata, element);
                }
            }
        }

        /*
            Binds search
        */

    }, {
        key: "bindSearch",
        value: function bindSearch() {
            // Custom search
            var self = this;

            self.typingtimer = null;
            self.typinginterval = 100;

            $("#searchcourses").keyup(function (e) {

                clearTimeout(self.typingtimer);

                var searchval = $("#searchcourses").val();

                self.searchFound = [];

                self.searchphrase = searchval.toLowerCase();

                if (searchval == "" || searchval == " ") {
                    // Just populate the faculties
                    $("#classdata").empty();
                    self.populateClassList([self.classdata], $("#classdata"), "", true);
                } else {
                    if (searchval.length > 2) {
                        self.typingtimer = setTimeout(function () {
                            self.doneTyping();
                        }, self.typinginterval);
                    }
                }
            });
        }

        /*
            Performs the search given the phrase when the user is done typing
        */

    }, {
        key: "doneTyping",
        value: function doneTyping() {
            var self = this;

            var searchphrasecopy = self.searchphrase.slice();

            // find and populate the results
            self.findText(self.classdata, searchphrasecopy, "", "", 0);

            // empty out whatever is there
            $("#classdata").empty();

            // scroll to the top
            $("#classdatawraper").scrollTop(0);

            if (self.searchFound.length && searchphrasecopy == self.searchphrase) {
                // We found results
                self.populateClassList(self.searchFound, $("#classdata"), "", true);
            } else if (searchphrasecopy == self.searchphrase) {
                $("#classdata").text("We couldn't find anything").slideDown();
            }
        }

        /*
            Returns a boolean as to whether the given class contains the specified text
        */

    }, {
        key: "findTextInClasses",
        value: function findTextInClasses(data, text) {

            // Check each class for matches
            for (var key in data["classes"]) {
                var thisclass = data["classes"][key];

                for (var prop in thisclass) {

                    // Check if an array
                    if (thisclass[prop].constructor === Array) {
                        for (var newprop in thisclass[prop]) {
                            if (thisclass[prop][newprop].toString().toLowerCase().indexOf(text) > -1) {
                                return true;
                            }
                        }
                    } else if (thisclass[prop].toString().toLowerCase().indexOf(text) > -1) {
                        return true;
                    }
                }
            }

            // Check the description attributes
            for (var key in data["description"]) {
                var thisdesc = data["description"][key];

                if (thisdesc.toString().toLowerCase().indexOf(text) > -1) {
                    return true;
                }
            }

            // Didn't find a match
            return false;
        }

        /*
            Properly adds a search result to the global dict
        */

    }, {
        key: "addSearchData",
        value: function addSearchData(data, key, depth, path) {
            data = jQuery.extend({}, data);
            data["path"] = path;

            if (this.searchFound[depth] == undefined) {
                this.searchFound[depth] = {};
            }

            this.searchFound[depth][key] = data;
        }

        /*
            Populates the global searchFound obj with courses that match the specified text (recursive)
        */

    }, {
        key: "findText",
        value: function findText(data, text, path, prevkey, depth, alreadyFound) {
            if (text != this.searchphrase) {
                return;
            }

            if (data["classes"] != undefined) {
                // we are parsing a class

                if (this.findTextInClasses(data, text)) {
                    var splitpath = path.split("\\");
                    var key = splitpath[splitpath.length - 2] + " " + prevkey;

                    // We only want to add this course if it hasn't already been added
                    if (alreadyFound != true) this.addSearchData(data, key, depth, path);
                }
            } else {
                for (var key in data) {
                    if (key != "description") {

                        var thispath = path + "\\" + key;

                        var searchkey = key;

                        // Add the subject to a course num if we can (231 = CPSC 231)
                        if (data[key]["classes"] != null) {
                            splitpath = thispath.split("\\");
                            searchkey = splitpath[splitpath.length - 2] + " " + searchkey;
                        }

                        var thisFound = false;
                        // Find the text
                        if (searchkey.toLowerCase().indexOf(text) > -1) {
                            // We found it in the key, add it
                            this.addSearchData(data[key], searchkey, depth, thispath);
                            thisFound = true;
                        } else {
                            // check if it has a description, if so, check that
                            if (data[key]["description"] != undefined && data[key]["description"]["name"] != undefined) {
                                if (data[key]["description"]["name"].toLowerCase().indexOf(text) > -1) {
                                    // We found the text in the description, add it to the found list
                                    this.addSearchData(data[key], searchkey, depth, thispath);
                                    thisFound = true;
                                }
                            }
                        }

                        var thisdata = data[key];

                        // Recursively look at the children
                        this.findText(thisdata, text, thispath, key, depth + 1, thisFound);
                    }
                }
            }
        }

        /*
            Generates the general accordian structure HTML given a value
        */

    }, {
        key: "generateAccordionHTML",
        value: function generateAccordionHTML(value, path, customclasses) {
            if (customclasses) return '<li class="has-children"><label path="' + path + '" accordopen="false" class="' + customclasses + '">' + value + '</label><ul></ul></li>';else return '<li class="has-children"><label path="' + path + '" accordopen="false">' + value + '</label><ul></ul></li>';
        }
    }], [{
        key: "abbreviateTimes",
        value: function abbreviateTimes(time) {
            // abbreviations of days
            var abbreviations = {
                "Mo": "M",
                "Tu": "T",
                "We": "W",
                "Th": "R",
                "Fr": "F",
                "Sa": "S",
                "Su": "U"
            };

            for (var reduce in abbreviations) {
                time = time.replace(reduce, abbreviations[reduce]);
            }

            // remove spacing around the dash
            time = time.replace(" - ", "-");

            return time;
        }
    }, {
        key: "abbreviateName",
        value: function abbreviateName(name) {
            // We abbreviate everything except the last name
            var fragments = name.split(" ");
            var abbreviated = "";

            for (var fragment in fragments) {
                // Only add spaces in between words
                if (fragment > 0) {
                    abbreviated += " ";
                }

                if (fragment == fragments.length - 1) {
                    // keep the full name
                    abbreviated += fragments[fragment];
                } else if (fragment == 0) {
                    var word = fragments[fragment];

                    abbreviated += word.charAt(0).toUpperCase() + ".";
                }
            }

            return abbreviated;
        }
    }]);

    return ClassList;
}();
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Generator = function () {
    function Generator(classes, blockedTimes) {
        _classCallCheck(this, Generator);

        // chosen classes
        this.classes = JSON.parse(JSON.stringify(classes));

        this.engineerFlag = false;

        if (window.uni == "UAlberta" && Number(window.term) % 10 === 0) {
            // Check if they are an engineering student
            this.engineerFlag = preferences.getEngineeringValue();

            // If they aren't an engineer, prune out courses that are restricted to engg outside of faculty of engg
            if (this.engineerFlag == false) {
                this.UAlbertaRemoveEnggClasses();
            }
        }

        // Remove "duplicate" classes
        this.removeClassDupes(this.classes);

        // Defines how many courses were selected, set by addCourseInfo
        this.courseamount = 0;

        // add additional data to the classes
        this.convertTimes();
        this.addCourseInfo();

        // update blocked times
        this.blockedTimes = jQuery.extend(true, [], window.calendar.blockedTimes);

        this.convertBlockedTimes();

        this.schedSort = false;
        this.schedgenerator = false;

        this.doneGenerating = false;
        this.doneScoring = false;

        this.terminated = false;

        // Generates the schedules
        this.schedGen();
    }

    /*
        For UAlberta, if the user is not in engg, remove restricted classes outside the faculty of engineering
    */


    _createClass(Generator, [{
        key: "UAlbertaRemoveEnggClasses",
        value: function UAlbertaRemoveEnggClasses() {
            for (var group in this.classes) {
                // for every group
                for (var course in this.classes[group]["courses"]) {
                    var thiscourse = this.classes[group]["courses"][course];

                    // Stores the current non engg classes
                    var nonEnggClasses = [];

                    // For every class
                    for (var classv in thiscourse["obj"]["classes"]) {
                        var thisclass = thiscourse["obj"]["classes"][classv];

                        if (thisclass['section'][1].match(/[a-z]/i) === null) {
                            nonEnggClasses.push(thisclass);
                        }
                    }

                    // Overwrite the classes with non-engg classes
                    thiscourse["obj"]["classes"] = nonEnggClasses;
                }
            }
        }

        /*
            Removes classes that share the same type, time, rmp score, group, status, and location as another
              This heuristic does not decrease accuracy since the removed classes have the same properties 
            as another that will be used in generation
        */

    }, {
        key: "removeClassDupes",
        value: function removeClassDupes(classes) {
            for (var group in classes) {
                // for every group

                for (var course in classes[group]["courses"]) {
                    var thiscourse = classes[group]["courses"][course];

                    // Stores the current non dupe classes
                    var nonDupeClasses = [];

                    // For every class
                    for (var classv in thiscourse["obj"]["classes"]) {
                        var thisclass = thiscourse["obj"]["classes"][classv];

                        var hasDupe = false;

                        // We want to make sure we don't remove a class the user manually specified
                        // We also don't want to remove duplicate lectures, since the student may desire a specific teacher
                        // Obviously, this can all be overridden by manually specifying classes
                        if (thiscourse["types"][thisclass["type"]] != thisclass["id"] && thisclass["type"] != "LEC") {

                            // They didn't explicitly want to remove this class, we can try to remove it if its a dupe
                            var thisrmpavg = Generator.getRMPAvgForClass(thisclass);
                            var timesString = JSON.stringify(thisclass["times"]);

                            // We only look at classes above this index
                            for (var anotherclass = parseInt(classv) + 1; anotherclass < thiscourse["obj"]["classes"].length; anotherclass++) {

                                var otherclass = thiscourse["obj"]["classes"][anotherclass];

                                // Check if it has similiar properties
                                if (otherclass["id"] != thisclass["id"] && otherclass["group"] == thisclass["group"] && otherclass["location"] == thisclass["location"] && otherclass["type"] == thisclass["type"] && thisrmpavg == Generator.getRMPAvgForClass(otherclass)) {

                                    var sectionConflict = false;
                                    // If u of a, make sure both classes are non-engg or eng
                                    if (window.uni == "UAlberta" && Number(window.term) % 10 === 0 && this.engineerFlag == true) {

                                        // For engg classes, the second element in the section string is always an alpha character
                                        if (otherclass['section'][1].match(/[a-z]/i) != null && thisclass['section'][1].match(/[a-z]/i) == null) {
                                            sectionConflict = true;
                                        }

                                        if (otherclass['section'][1].match(/[a-z]/i) == null && thisclass['section'][1].match(/[a-z]/i) != null) {
                                            sectionConflict = true;
                                        }
                                    }

                                    if (sectionConflict == false) {
                                        // check if this has a worse status or the same status
                                        if (otherclass["status"] == "Open" && thisclass["status"] != "Open" || otherclass["status"] == thisclass["status"]) {

                                            var otherTimesString = JSON.stringify(otherclass["times"]);

                                            // Check if they have the same times
                                            if (otherTimesString == timesString) {
                                                // This is a dupe, remove it
                                                hasDupe = true;
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        if (hasDupe == false) {
                            // add it to the non dupe classes array
                            nonDupeClasses.push(thisclass);
                        }
                    }

                    // Overwrite the classes with non-duped classes
                    thiscourse["obj"]["classes"] = nonDupeClasses;
                }
            }
        }

        /*
            Given a class object, returns the RMP average for that class
        */

    }, {
        key: "schedGen",


        /*
            Spawns a web worker that generates possible schedules given classes
        */
        value: function schedGen() {
            var self = this;

            window.calendar.resetCalendarStatus();

            self.doneGenerating = false;

            // Get the user's scoring preferences
            // Want to get whether they only allow open classes or not
            this.getPreferences();

            window.calendar.doneLoading(function () {
                // Instantiate the generator
                self.schedgenerator = operative({
                    possibleschedules: [],
                    combinations: [],
                    classes: {},
                    init: function init(classes, blockedTimes, term, uni, enggFlag, onlyOpen, callback) {
                        this.classes = classes;
                        this.onlyOpen = onlyOpen;
                        this.blockedTimes = blockedTimes;
                        this.uni = uni;
                        this.term = term;
                        this.enggFlag = enggFlag;

                        this.findCombinations();

                        this.iterateCombos();

                        callback(this.possibleschedules);
                    },
                    /*
                        Iterates through every group combinations to find possible non-conflicting schedules
                    */
                    iterateCombos: function iterateCombos() {

                        // reset possible schedules
                        this.possibleschedules = [];

                        if (this.combinations.length > 0) {
                            // there must be more than 0 combos for a schedule
                            for (var combos in this.combinations[0]) {
                                // create a copy to work with
                                var combocopy = JSON.parse(JSON.stringify(this.combinations[0][combos]));

                                // generate the schedules
                                this.generateSchedules([], combocopy);

                                this.possibleschedulescopy = JSON.parse(JSON.stringify(this.possibleschedules));

                                if (this.combinations.length > 1) {
                                    // console.log("Processing further groups");
                                    this.possibleschedules = [];
                                    // We have to add the other groups
                                    for (var group = 1; group < this.combinations.length; group++) {
                                        for (var newcombo in this.combinations[group]) {

                                            // for every previous schedule
                                            // TODO: If this starts to become slow, we might want to apply some heuristics
                                            for (var possibleschedule in this.possibleschedulescopy) {
                                                var combocopy = JSON.parse(JSON.stringify(this.combinations[group][newcombo]));
                                                this.generateSchedules(this.possibleschedulescopy[possibleschedule], combocopy);
                                            }
                                        }

                                        if (group < this.combinations.length - 1) {
                                            // clear the schedules (we don't want partially working schedules)
                                            this.possibleschedulescopy = JSON.parse(JSON.stringify(this.possibleschedules));
                                            this.possibleschedules = [];
                                        }
                                    }
                                }
                            }
                        }
                    },
                    /*
                        Pushes every combination given the type of groups
                    */
                    findCombinations: function findCombinations() {
                        this.combinations = [];

                        for (var group in this.classes) {
                            var thisgroup = this.classes[group];
                            var type = thisgroup["type"];

                            // figure out the length of the courses
                            var coursekeys = Object.keys(thisgroup["courses"]);

                            if (coursekeys.length > 0) {
                                // there must be courses selected
                                if (type == 0 || type > coursekeys.length) {
                                    // they selected all of or they wanted more courses than chosen
                                    type = coursekeys.length;
                                }

                                // convert the courses to an array
                                var thesecourses = [];
                                for (var course in thisgroup["courses"]) {
                                    thisgroup["courses"][course]["name"] = course;
                                    thesecourses.push(thisgroup["courses"][course]);
                                }

                                // push the combinations
                                this.combinations.push(this.k_combinations(thesecourses, type));
                            }
                        }
                    },
                    generateSchedules: function generateSchedules(schedule, queue) {
                        /*
                            Given a wanted class queue and current schedule, this method will recursively find every schedule that doesn't conflict
                        */
                        var timeconflict = false;

                        if (queue.length == 0) {
                            // we found a successful schedule, push it
                            // we need to make a copy since the higher depths will undo the actions
                            this.possibleschedules.push(JSON.parse(JSON.stringify(schedule)));
                        } else {
                            // Check that if they selected that they only want open classes,
                            // we make sure the most recent one is open

                            // NOTE: If the user manually specified this class, we don't check whether its open or not
                            if (schedule.length > 0 && this.onlyOpen == true && schedule[schedule.length - 1]["manual"] != true) {
                                var addedClass = schedule[schedule.length - 1];

                                if (addedClass["status"] != "Open") {
                                    timeconflict = true;
                                }
                            }

                            // For UAlberta, if the user is in engg, if the last class is an engg restricted class and this is the same course,
                            // make sure they are both engg
                            if (schedule.length > 1 && timeconflict == false && enggFlag == true && this.uni == "UAlberta" && Number(this.term) % 10 === 0) {

                                if (schedule[schedule.length - 1]["name"] == schedule[schedule.length - 2]["name"]) {
                                    // make sure they have the same group number

                                    // If the first one is engg, then the second one must be
                                    // and vice versa
                                    if (schedule[schedule.length - 2]['section'][1].match(/[a-z]/i) != null && schedule[schedule.length - 1]['section'][1].match(/[a-z]/i) == null) {
                                        timeconflict = true;
                                    }

                                    if (schedule[schedule.length - 2]['section'][1].match(/[a-z]/i) == null && schedule[schedule.length - 1]['section'][1].match(/[a-z]/i) != null) {
                                        timeconflict = true;
                                    }
                                }
                            }

                            if (schedule.length > 0 && timeconflict == false) {
                                // Check if the most recent class conflicts with any user blocked times
                                var recentClass = schedule[schedule.length - 1];

                                for (var time in recentClass["times"]) {
                                    var time = recentClass["times"][time];

                                    for (var day in time[0]) {
                                        var day = time[0][day];

                                        if (this.blockedTimes[day] != undefined) {
                                            for (var blockedTime in this.blockedTimes[day]) {
                                                var thisBlockedTime = this.blockedTimes[day][blockedTime];

                                                // The blocked time has a span of 30min, check if it conflicts
                                                if (this.isConflicting(time[1], [thisBlockedTime, thisBlockedTime + 30])) {
                                                    timeconflict = true;
                                                    break;
                                                }
                                            }
                                        }

                                        if (timeconflict) break;
                                    }

                                    if (timeconflict) break;
                                }
                            }

                            if (schedule.length > 1 && timeconflict == false) {
                                // TODO: REFACTOR NEEDED

                                // Check whether the most recent index has a time conflict with any of the others
                                for (var x = 0; x < schedule.length - 1; x++) {
                                    var thistimes = schedule[x]["times"];

                                    for (var time in thistimes) {
                                        var thistime = thistimes[time];
                                        // compare to last
                                        for (var othertime in schedule[schedule.length - 1]["times"]) {
                                            var othertime = schedule[schedule.length - 1]["times"][othertime];

                                            // check if any of the days between them are the same
                                            for (var day in thistime[0]) {
                                                var day = thistime[0][day];
                                                if (othertime[0].indexOf(day) > -1) {
                                                    // same day, check for time conflict
                                                    if (this.isConflicting(thistime[1], othertime[1])) {
                                                        timeconflict = true;
                                                    }
                                                }
                                            }

                                            if (timeconflict) break;
                                        }

                                        if (timeconflict) break;
                                    }

                                    if (timeconflict) break;
                                }
                            }

                            if (schedule.length > 1 && timeconflict == false) {
                                // if there are group numbers, make sure all classes are in the same group
                                // Some Unis require your tutorials to match the specific lecture etc...
                                // we only need to look at the most recent and second most recent groups
                                // since classes that belong to the same course are appended consecutively
                                if (schedule[schedule.length - 1]["name"] == schedule[schedule.length - 2]["name"]) {
                                    // make sure they have the same group number

                                    // If it is a string, make it an array
                                    if (typeof schedule[schedule.length - 1]["group"] == "string") {
                                        schedule[schedule.length - 1]["group"] = [schedule[schedule.length - 1]["group"]];
                                    }
                                    if (typeof schedule[schedule.length - 2]["group"] == "string") {
                                        schedule[schedule.length - 2]["group"] = [schedule[schedule.length - 2]["group"]];
                                    }

                                    var isPossible = false;

                                    // Check if there is any combination that matches up
                                    for (var firstgroup in schedule[schedule.length - 1]["group"]) {
                                        for (var secondgroup in schedule[schedule.length - 2]["group"]) {
                                            if (schedule[schedule.length - 1]["group"][firstgroup] == schedule[schedule.length - 2]["group"][secondgroup]) {
                                                isPossible = true;
                                                break;
                                            }
                                        }
                                    }

                                    // Check if there is a possible combo, if not, there is a time conflict
                                    if (isPossible == false) timeconflict = true;
                                }
                            }

                            if (timeconflict == false) {
                                // we can continue

                                if (Object.keys(queue[0]["types"]).length > 0) {
                                    // find an open type
                                    var foundType = false;
                                    for (var type in queue[0]["types"]) {
                                        if (queue[0]["types"][type] == true) {
                                            // they chose a general class to fulfill
                                            foundType = type;
                                            break;
                                        } else if (queue[0]["types"][type] != false) {
                                            // they chose a specific class to fulfill
                                            // add the specific class

                                            // find the class
                                            for (var classv in queue[0]["obj"]["classes"]) {
                                                var thisclass = queue[0]["obj"]["classes"][classv];

                                                if (thisclass["id"] == queue[0]["types"][type]) {
                                                    // we found the class obj, add it to the schedule

                                                    // The user manually specified this class, set the flag
                                                    thisclass["manual"] = true;

                                                    // Push it to this schedule
                                                    schedule.push(thisclass);

                                                    // remove the type from the queue
                                                    delete queue[0]["types"][type];

                                                    // recursively call the generator
                                                    this.generateSchedules(schedule, queue);

                                                    // remove the "manual" key
                                                    delete thisclass["manual"];

                                                    // remove the class
                                                    schedule.pop();

                                                    // add the type again
                                                    queue[0]["types"][type] = thisclass["id"];

                                                    break;
                                                }
                                            }

                                            break;
                                        }
                                    }

                                    if (foundType != false) {
                                        // remove the type
                                        delete queue[0]["types"][foundType];

                                        // we need to iterate through the classes, find which ones match this type
                                        for (var classv in queue[0]["obj"]["classes"]) {
                                            var thisclass = queue[0]["obj"]["classes"][classv];

                                            if (thisclass["type"] == foundType) {
                                                // Push the class
                                                schedule.push(thisclass);

                                                // recursively go down a depth
                                                this.generateSchedules(schedule, queue);

                                                // pop the class we added
                                                schedule.pop();
                                            }
                                        }

                                        queue[0]["types"][foundType] = true;
                                    }
                                } else {
                                    // we've already found all the types for this class, move on to the next
                                    // remove this course
                                    var thisitem = queue.shift();

                                    this.generateSchedules(schedule, queue);

                                    // add the item back
                                    queue.unshift(thisitem);
                                }
                            }
                        }
                    },
                    isConflicting: function isConflicting(time1, time2) {
                        // time1 and time2 are arrays with the first index being the total minutes 
                        // since 12:00AM that day of the starttime and the second being the endtime
                        // ex. [570, 645] and [590, 740]
                        // We check whether the end time of time2 is greater than the start time of time1
                        // and whether the end time of time1 is greater than the start time of time2
                        // if so, there is a conflict

                        if (time1[1] > time2[0] && time2[1] > time1[0]) {
                            return true;
                        } else {
                            return false;
                        }
                    },
                    k_combinations: function k_combinations(set, k) {
                        /**
                         * Copyright 2012 Akseli Palén.
                         * Created 2012-07-15.
                         * Licensed under the MIT license.
                         * 
                         * <license>
                         * Permission is hereby granted, free of charge, to any person obtaining
                         * a copy of this software and associated documentation files
                         * (the "Software"), to deal in the Software without restriction,
                         * including without limitation the rights to use, copy, modify, merge,
                         * publish, distribute, sublicense, and/or sell copies of the Software,
                         * and to permit persons to whom the Software is furnished to do so,
                         * subject to the following conditions:
                         * 
                         * The above copyright notice and this permission notice shall be
                         * included in all copies or substantial portions of the Software.
                         * 
                         * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
                         * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
                         * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
                         * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
                         * BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
                         * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
                         * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
                         * SOFTWARE.
                         * </lisence>
                         * 
                         * Implements functions to calculate combinations of elements in JS Arrays.
                         * 
                         * Functions:
                         *   k_combinations(set, k) -- Return all k-sized combinations in a set
                         *   combinations(set) -- Return all combinations of the set
                         */

                        var i, j, combs, head, tailcombs;

                        // There is no way to take e.g. sets of 5 elements from
                        // a set of 4.
                        if (k > set.length || k <= 0) {
                            return [];
                        }

                        // K-sized set has only one K-sized subset.
                        if (k == set.length) {
                            return [set];
                        }

                        // There is N 1-sized subsets in a N-sized set.
                        if (k == 1) {
                            combs = [];
                            for (i = 0; i < set.length; i++) {
                                combs.push([set[i]]);
                            }
                            return combs;
                        }

                        // Assert {1 < k < set.length}

                        // Algorithm description:
                        // To get k-combinations of a set, we want to join each element
                        // with all (k-1)-combinations of the other elements. The set of
                        // these k-sized sets would be the desired result. However, as we
                        // represent sets with lists, we need to take duplicates into
                        // account. To avoid producing duplicates and also unnecessary
                        // computing, we use the following approach: each element i
                        // divides the list into three: the preceding elements, the
                        // current element i, and the subsequent elements. For the first
                        // element, the list of preceding elements is empty. For element i,
                        // we compute the (k-1)-computations of the subsequent elements,
                        // join each with the element i, and store the joined to the set of
                        // computed k-combinations. We do not need to take the preceding
                        // elements into account, because they have already been the i:th
                        // element so they are already computed and stored. When the length
                        // of the subsequent list drops below (k-1), we cannot find any
                        // (k-1)-combs, hence the upper limit for the iteration:
                        combs = [];
                        for (i = 0; i < set.length - k + 1; i++) {
                            // head is a list that includes only our current element.
                            head = set.slice(i, i + 1);
                            // We take smaller combinations from the subsequent elements
                            tailcombs = this.k_combinations(set.slice(i + 1), k - 1);
                            // For each (k-1)-combination we join it with the current
                            // and store it to the set of k-combinations.
                            for (j = 0; j < tailcombs.length; j++) {
                                combs.push(head.concat(tailcombs[j]));
                            }
                        }
                        return combs;
                    }
                });

                // only show the loader if the generation is taking longer than 500ms
                // since the animations for it would take longer than the actual gen
                setTimeout(function () {
                    if (self.doneScoring == false) window.calendar.startLoading("Generating Schedules...");
                }, 500);

                // Spawn the generator
                self.schedgenerator.init(self.classes, self.blockedTimes, window.term, window.uni, preferences.getEngineeringValue(), self.onlyOpen, function (result) {
                    console.log("Web worker finished generating schedules");

                    if (self.terminated == false) {
                        self.possibleschedules = result;

                        self.doneGenerating = true;

                        // Now score and sort them
                        self.schedSorter();
                    }
                });
            });
        }

        /*
            Spawns a web worker that sorts and scores the current possibleschedules
        */

    }, {
        key: "schedSorter",
        value: function schedSorter() {
            var self = this;

            window.calendar.resetCalendarStatus();

            self.doneScoring = false;

            // Get the user's scoring preferences
            this.getPreferences();

            // Instantiate the sorter
            self.schedSort = operative({
                possibleschedules: [],
                init: function init(schedules, morningSlider, nightSlider, consecutiveSlider, rmpSlider, rmpData, rmpAvg, callback) {
                    // Set local variables in the blob
                    this.morningSlider = morningSlider;
                    this.nightSlider = nightSlider;
                    this.consecutiveSlider = consecutiveSlider;
                    this.rmpSlider = rmpSlider;
                    this.rmpData = rmpData;
                    this.rmpAvg = rmpAvg;

                    // Add the scores for each schedules
                    for (var schedule in schedules) {
                        var thisschedule = schedules[schedule];

                        // add the score to the first index
                        thisschedule.unshift(this.scoreSchedule(thisschedule));
                    }

                    // Now sort
                    schedules.sort(this.compareSchedules);

                    callback(schedules);
                },
                /*
                    Compare function for the sorting algorithm
                */
                compareSchedules: function compareSchedules(a, b) {
                    if (a[0] > b[0]) {
                        return -1;
                    }
                    if (b[0] > a[0]) {
                        return 1;
                    }

                    // a must be equal to b
                    return 0;
                },
                /*
                    Returns a numerical score given a schedule that defines how "good" it is given the user's preferences
                */
                scoreSchedule: function scoreSchedule(schedule) {
                    var thisscore = 0;

                    var totalrating = 0;
                    var totalteachers = 0;

                    for (var classv in schedule) {
                        var thisclass = schedule[classv];

                        // add a score based upon the teachers
                        totalteachers += thisclass["teachers"].length;

                        for (var teacher in thisclass["teachers"]) {
                            teacher = thisclass["teachers"][teacher];

                            if (this.rmpData[teacher] != undefined && this.rmpData[teacher]["numratings"] > 2) {
                                totalrating += this.rmpData[teacher]["rating"];
                            } else {
                                // just give them an average rating
                                totalrating += this.rmpAvg;
                            }
                        }
                    }

                    var avgrmp = totalrating / totalteachers * 3;

                    if (this.rmpSlider > 0) {
                        // make this value worth more to the total score
                        avgrmp *= 1 + this.rmpSlider / 20;
                    }

                    //console.log("AVG RMP: " + avgrmp);

                    thisscore += avgrmp;

                    // We want to transform the data into a usuable format for easily seeing how apart each class is
                    var formattedschedule = this.formatScheduleInOrder(schedule);

                    var classtimescore = 0.0;

                    for (var day in formattedschedule) {
                        var day = formattedschedule[day];

                        // Min/max time of the classes today
                        var mintime = 9999999;
                        var maxtime = 0;
                        for (var x = 0; x < day.length; x++) {
                            var time = day[x];

                            if (time[0] < mintime) {
                                mintime = time[0];
                            }

                            if (time[1] > maxtime) {
                                maxtime = time[1];
                            }

                            // check if it starts in the mourning
                            if (time[0] <= 720) {
                                classtimescore += this.morningSlider / 50;
                            }

                            // check if it starts in the night
                            if (time[0] >= 1020) {
                                classtimescore += this.nightSlider / 50;
                            }

                            // check for consecutive classes
                            // make sure there is a class next
                            if (x + 1 < day.length && this.consecutiveSlider != 0) {
                                // get the time of the next class
                                var nexttime = day[x + 1];

                                // get the difference between the end of class1 and start of class2
                                var timediff = nexttime[0] - time[1];

                                var thisconsecscore = 0;

                                if (this.consecutiveSlider > 0) {
                                    var thisconsecscore = 0.2;
                                } else {
                                    var thisconsecscore = -0.2;
                                }

                                thisconsecscore += timediff / 10 * (0.006 * -(this.consecutiveSlider / 10));

                                //console.log("Consecutive: " + thisconsecscore);
                                classtimescore += thisconsecscore;
                            }
                        }

                        // we want there to be less time spent at school overall for a given day
                        // the longer the difference, the more penalty there is on the score depending on how much the user values time slots
                        var timediff = maxtime - mintime;
                        if (timediff > 0) {
                            if (this.rmpSlider < 0) {
                                // multiply the value
                                thisscore -= timediff / 60 * (1 + -(this.rmpSlider / 40));
                            } else {
                                thisscore -= timediff / 60 * 1.5;
                            }
                        }
                    }

                    // The user prioritizes time slots over professors, multiply this value
                    if (this.rmpSlider < 0) {
                        // make this value worth more to the total score
                        classtimescore *= 1 + -this.rmpSlider / 20;
                    }

                    thisscore += classtimescore;
                    //console.log("Classes score: " + classtimescore);
                    //console.log(formattedschedule);


                    return thisscore;
                },
                /*
                    Formats a given schedule so that it is an array of days with an array of sorted times of each event
                */
                formatScheduleInOrder: function formatScheduleInOrder(schedule) {
                    // formats a list of events to the appropriate duration

                    // the schedule must not have any conflicting events
                    var formated = [];

                    //console.log(schedule);

                    for (var classv in schedule) {
                        var thisclass = schedule[classv];

                        // for each time
                        for (var time in thisclass["times"]) {
                            var thistime = thisclass["times"][time];

                            // for each day in this time
                            for (var day in thistime[0]) {
                                var day = thistime[0][day];

                                // check whether the day index is an array
                                if (!(formated[day] instanceof Array)) {
                                    // make it an array
                                    formated[day] = [];
                                }

                                if (formated[day].length == 0) {
                                    //console.log("Appending " + thistime[1] + " to " + day);
                                    // just append the time
                                    formated[day].push(thistime[1]);
                                } else {
                                    // iterate through each time already there
                                    for (var formatedtime in formated[day]) {
                                        // check if the end time of this event is less than the start time of the next event
                                        var thisformatedtime = formated[day][formatedtime];

                                        if (thistime[1][1] < thisformatedtime[0]) {
                                            //console.log("Adding " + thistime[1] + " to " + day);
                                            formated[day].splice(parseInt(formatedtime), 0, thistime[1]);
                                            break;
                                        } else {
                                            if (formated[day][parseInt(formatedtime) + 1] == undefined) {
                                                //console.log("Pushing " + thistime[1] + " to the end of " + day);
                                                // push it to the end
                                                formated[day].push(thistime[1]);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    return formated;
                }
            });

            // Spawn the web worker
            self.schedSort.init(this.possibleschedules, this.morningSlider, this.nightSlider, this.consecutiveSlider, this.rmpSlider, window.classList.rmpdata, window.classList.rmpavg, function (result) {
                console.log("Web worker finished sorting schedules");
                console.log(result);

                if (self.terminated == false) {
                    self.doneScoring = true;

                    // Replace the reference with the sorted schedules
                    self.possibleschedules = result;

                    window.calendar.doneLoading(function () {
                        self.processSchedules(result);
                    });
                }
            });
        }

        /*
            Adds additional course info to each class for easier processing after schedules have been generated
        */

    }, {
        key: "addCourseInfo",
        value: function addCourseInfo() {
            for (var group in this.classes) {
                var thisgroup = this.classes[group];
                var thiscourses = thisgroup["courses"];
                for (var course in thiscourses) {
                    // Add this to the course amount
                    this.courseamount += 1;

                    var thiscourse = thiscourses[course];

                    // convert the times of each class
                    var classobj = thiscourse["obj"]["classes"];

                    for (var classv in classobj) {
                        var thisclass = classobj[classv];

                        thisclass["name"] = course;
                    }
                }
            }
        }

        /*
            Converts the times on the desired classes to an easily processable format
        */

    }, {
        key: "convertTimes",
        value: function convertTimes() {
            for (var group in this.classes) {
                var thisgroup = this.classes[group];
                var thiscourses = thisgroup["courses"];
                for (var course in thiscourses) {
                    var thiscourse = thiscourses[course];

                    // convert the times of each class
                    var classobj = thiscourse["obj"]["classes"];

                    for (var classv in classobj) {
                        var thisclass = classobj[classv];

                        // Keep a copy of the old formatting for future uses
                        thisclass["oldtimes"] = thisclass["times"].slice();

                        // convert time
                        for (var time in thisclass["times"]) {
                            thisclass["times"][time] = Generator.convertTime(thisclass["times"][time]);
                        }
                    }
                }
            }
        }

        /*
            Converts the format of the blockedTimes to the total minutes format used by the generator
        */

    }, {
        key: "convertBlockedTimes",
        value: function convertBlockedTimes() {
            for (var day in this.blockedTimes) {
                for (var time in this.blockedTimes[day]) {
                    var thistime = this.blockedTimes[day][time];

                    var totalMin = parseInt(thistime.split("-")[0]) * 60 + parseInt(thistime.split("-")[1]);

                    this.blockedTimes[day][time] = totalMin;
                }
            }
        }

        /*
            Converts a time to total minutes since 12:00AM on that day
        */

    }, {
        key: "processSchedules",


        /*
            Processes a list of successful scored schedules and sets up the calendar
        */
        value: function processSchedules(schedules) {
            // update the total
            window.calendar.setTotalGenerated(schedules.length);

            // update current
            if (schedules.length == 0) window.calendar.setCurrentIndex(-1);else if (schedules.length > 0) window.calendar.setCurrentIndex(0);

            window.calendar.clearEvents();

            if (schedules.length > 0) {
                // populate the first one
                window.calendar.resetCalendarStatus();

                window.calendar.displaySchedule(schedules[0]);
            } else {
                // If there are blocked times, make sure the schedule fits all of them
                // This is to make sure the user can remove time blocks that were outside
                // of the previous schedule range
                window.calendar.displayBlockedTimes();

                // If they added any course and there are no possibilities, set a status
                if (this.courseamount > 0) window.calendar.setCalendarStatus("No Possible Schedules :(");

                // Force the current schedule to empty
                window.calendar.currentSchedule = [];

                // Destroy all the tooltips
                window.calendar.destroyEventTooltips();
            }
        }

        /*
            Returns the schedule at the specified index
        */

    }, {
        key: "getSchedule",
        value: function getSchedule(index) {
            if (this.possibleschedules.length - 1 >= index) {
                return this.possibleschedules[index];
            } else {
                return false;
            }
        }

        /*
            Sets the local preference values with the current state of the sliders
        */

    }, {
        key: "getPreferences",
        value: function getPreferences() {
            this.morningSlider = preferences.getMorningValue();
            this.nightSlider = preferences.getNightValue();
            this.consecutiveSlider = preferences.getConsecutiveValue();
            this.rmpSlider = preferences.getRMPValue();
            this.onlyOpen = preferences.getOnlyOpenValue();
        }

        /*
            Stops any current generation
        */

    }, {
        key: "stop",
        value: function stop() {
            if (this.schedSort != false) this.schedSort.terminate();
            if (this.schedgenerator != false) this.schedgenerator.terminate();

            this.terminated = true;
        }

        /*
            Updates the sorting for the current schedule given new preferences
        */

    }, {
        key: "updateScores",
        value: function updateScores() {
            var self = this;

            // check whether we have already generated schedules
            if (this.doneGenerating == true) {
                // terminate any current scorer
                if (this.schedSort != false) this.schedSort.terminate();
                if (this.schedgenerator != false) this.schedgenerator.terminate();

                // remove current scores
                for (var schedule in this.possibleschedules) {
                    var thisschedule = this.possibleschedules[schedule];

                    // remove the first index (score) if its a number
                    if (typeof thisschedule[0] == "number") thisschedule.shift();
                }

                setTimeout(function () {
                    if (self.doneScoring == false && window.calendar.isLoading == false) window.calendar.startLoading("Generating Schedules...");
                }, 500);

                // check whether the current open value is different, if so, we need to regenerate the schedules
                if (preferences.getOnlyOpenValue() != this.onlyOpen) {
                    // we need to fully regenerate the schedule
                    self.doneScoring = false;
                    this.schedGen();
                } else {
                    // now score it again
                    this.schedSorter();
                }
            }
        }
    }], [{
        key: "getRMPAvgForClass",
        value: function getRMPAvgForClass(thisclass) {

            var rmptotal = 0;
            var rmpamount = 0;

            for (var teacher in thisclass["teachers"]) {
                // check if in rmp
                if (window.classList.rmpdata[teacher] != undefined && window.classList.rmpdata[teacher]["rating"] != undefined) {
                    rmptotal += window.classList.rmpdata[teacher]["rating"];
                    rmpamount += 1;
                }
            }

            if (rmpamount == 0) {
                // we couldn't find any matches, just return the rmp average for every teacher
                return window.classList.rmpavg;
            } else {
                // Got a match
                return rmptotal / rmpamount;
            }
        }
    }, {
        key: "convertToTotalMinutes",
        value: function convertToTotalMinutes(time) {
            // Format XX:XXPM or AM 
            var type = time.slice(-2);

            var hours = parseInt(time.split(":")[0]);

            if (type == "PM" && hours < 12) {
                hours += 12;
            }

            var minutes = time.split(":")[1];
            minutes = minutes.substr(0, minutes.length - 2);
            minutes = parseInt(minutes);

            return hours * 60 + minutes;
        }

        /*
            Converts the total minutes from 12:00AM on a given day to the timestamp
        */

    }, {
        key: "totalMinutesToTime",
        value: function totalMinutesToTime(time) {
            var minutes = time % 60;
            var hours = Math.floor(time / 60);

            return hours + ":" + minutes;
        }

        /*
            Converts a time of the form Mo 12:00PM-1:00PM to an array of days and total minutes
        */

    }, {
        key: "convertTime",
        value: function convertTime(time) {
            // first index are the days (integer with Monday being 0)
            // second index is the array with time
            var newtime = [];

            // Map the days
            var map = {
                "Mo": 0,
                "Tu": 1,
                "We": 2,
                "Th": 3,
                "Fr": 4,
                "Sa": 5,
                "Su": 6
            };

            // Map for other types of days
            var map2 = {
                "M": 0,
                "T": 1,
                "W": 2,
                "R": 3,
                "F": 4,
                "S": 5,
                "U": 6
            };

            if (time.indexOf(" - ") > -1) {
                var timesplit = time.split(" - ");
                var endtime = Generator.convertToTotalMinutes(timesplit[1]);
                var starttime = Generator.convertToTotalMinutes(timesplit[0].split(" ")[1]);

                // get the days
                var days = timesplit[0].split(" ")[0];

                var dayarray = [];

                for (var day in map) {
                    if (days.indexOf(day) > -1) {
                        days = days.replace(day, "");
                        dayarray.push(map[day]);
                    }
                }

                // For other naming schemes
                for (var day in map2) {
                    if (days.indexOf(day) > -1) {
                        dayarray.push(map2[day]);
                    }
                }
            } else {
                // We don't know how to process this time
                // This can happen with courses like web based courses with a time of "TBA"
                newtime.push([-1]);
                newtime.push([0, 0]);
            }

            newtime.push(dayarray);
            newtime.push([starttime, endtime]);

            return newtime;
        }
    }]);

    return Generator;
}();
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Loading = function () {
	// Creates the loading animation at the specified element

	function Loading(element, loadingtext, styling) {
		_classCallCheck(this, Loading);

		this.element = element;

		// We need at least 150px for the animation
		element.css("min-height", "150px");

		// TODO: We should use the user's most recent selections to generate the loading subjects
		this.html = $(this.createCubeHTML(["CPSC", "ART", "CHEM", "GEOG", "MATH", "STAT"], loadingtext, styling)).hide().appendTo(element).fadeIn();
	}

	/*
 	Constructs the cube html given the subjects
 */


	_createClass(Loading, [{
		key: "createCubeHTML",
		value: function createCubeHTML(subjects, text, styling) {
			this.faces = ["front", "back", "left", "right", "bottom", "top"];

			if (styling == undefined) var html = "<center id='loading'><div style='display: inline;' id='status'>" + text + "</div><div class='Cube panelLoad'>";else var html = "<center id='loading' style='" + styling + "'><div style='display: inline;' id='status'>" + text + "</div><div class='Cube panelLoad'>";

			for (var key in subjects) {
				html += "<div class='cube-face cube-face-" + this.faces[key] + "'>" + subjects[key] + "</div>";
			}
			html += "</div></center>";

			return html;
		}

		/*
  	Fade out and remove the loading animation
  */

	}, {
		key: "remove",
		value: function remove(cb) {
			self = this;

			// Fade out the animation
			this.html.fadeOut(function () {
				// Change the min height on the parent, remove the loader html and initiate the callback
				self.element.animate({ "min-height": "" }, 500, function () {
					self.html.remove();
					cb();
				});
			});
		}

		/*
  	Sets the status text to the given message
  */

	}, {
		key: "setStatus",
		value: function setStatus(message) {
			console.log("Changing data");
			this.html.find("#status:first").text(message);
		}
	}]);

	return Loading;
}();
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MyCourses = function () {
    function MyCourses(uni, term) {
        _classCallCheck(this, MyCourses);

        this.courses = [];
        this.generator = false;

        this.uni = uni;
        this.term = term;

        $("#coursegroups").empty();
        $("#courseList").empty();

        // Update the preferences shown
        window.preferences.updatedUni(uni);

        this.numConvert = {
            0: "All",
            1: "One",
            2: "Two",
            3: "Three",
            4: "Four",
            5: "Five"
        };
    }

    /*
        Creates and appends the "Add group" button
    */


    _createClass(MyCourses, [{
        key: "genAddGroupBtn",
        value: function genAddGroupBtn() {
            var self = this;

            var addGroupbtn = $('<li role="presentation" id="addGroupbtn" style="margin-left: 8px;"' + 'data-toggle="tooltip" title="Add New Course Group"><a class="MyCourses">&plus;</a></li>');

            // Initialize the tooltip
            addGroupbtn.tooltip();

            addGroupbtn.click(function (event) {
                // Add One of group
                self.addGroup(1);
            });

            $("#coursegroups").append(addGroupbtn);
        }

        /*
            If there is a saved state, loads it and populates the courses
            If not, sets up the initial state
              Called by ClassList when done loading the class list
        */

    }, {
        key: "loadState",
        value: function loadState() {

            // generate the add group btn
            this.genAddGroupBtn();

            var loadedState = localStorage.getItem(this.uni + "_" + this.term + "_saved");

            // Parse it
            if (loadedState != null) loadedState = JSON.parse(loadedState);

            // Make sure it has a length > 0
            if (loadedState != null && loadedState.length > 0) {
                console.log("Loaded saved state");

                this.courses = loadedState;

                for (var group in this.courses) {
                    var thisgroup = this.courses[group];

                    if (group == 0) {
                        // you cannot remove the first group
                        this.generatePill(group, thisgroup["type"], true);
                    } else {
                        this.generatePill(group, thisgroup["type"]);
                    }
                }
                // set the first group active
                this.setGroupActive(0);

                // start generation
                this.startGeneration();
            } else {
                // add default group
                this.addGroup(0, true);
                this.setGroupActive(0);
            }
        }

        /*
            Saves the current selected courses into localStorage
        */

    }, {
        key: "saveState",
        value: function saveState() {
            localStorage.setItem(this.uni + "_" + this.term + "_saved", JSON.stringify(this.courses));
        }

        /*
            Adds a new course group of the specified type (0 for All, 1 for one, etc..)
        */

    }, {
        key: "addGroup",
        value: function addGroup(type, noremove) {
            // make sure we have 4 total groups or less
            if (this.courses.length <= 3) {
                var thisgroup = { "type": type, "courses": {} };
                var id = this.courses.length;
                this.courses[id] = thisgroup;

                this.generatePill(id, type, noremove);
            }

            // Remove the add button if the max group amount is exceeded
            if (this.courses.length == 4) $("#addGroupbtn").hide();
        }

        /*
            Generates, binds, and appends the given pill with the speicifed id and type
        */

    }, {
        key: "generatePill",
        value: function generatePill(id, type, noremove) {
            var self = this;

            var text = this.numConvert[type] + " of";

            var html = $('<li class="dropdown" groupid="' + id + '"><a style="cursor: pointer;" id="grouptext" data-toggle="dropdown" class="dropdown-toggle">' + text + '<span class="caret"></span></a><ul class="dropdown-menu" aria-labelledby="grouptext" style="min-width: 90px;"></ul></li>');

            html.find("a:first").click(function (e) {
                // If a pill is already selected, open the dropdown
                // If not, set the pill as active

                // check if this group is already active
                var groupid = $(this).parent().attr("groupid");

                // Check if we need to set this as active
                if (groupid != self.activeGroup) {
                    // we don't want the dropdown to open for this item
                    e.stopPropagation();

                    // check if the dropdown for the old active pill is open
                    // if so, close it
                    var isopen = $('li[groupid="' + self.activeGroup + '"]').hasClass("open");

                    if (isopen == true) {
                        // close it
                        $('li[groupid="' + self.activeGroup + '"]').find('.dropdown-menu').dropdown('toggle');
                    }

                    // set this group as active
                    self.setGroupActive(groupid);
                }
            });

            // Populate the dropdown
            html.find('.dropdown-menu').append(this.generatePillDropdown(noremove));

            // Bind the dropdown click handler
            html.find('li').click(function (event) {
                // find the group type
                var grouptype = $(this).attr("grouptype");
                // find the group id
                var groupid = $(this).parent().parent().attr("groupid");

                if (grouptype == -1) {
                    // wants to remove this group
                    self.removeGroup(groupid);
                } else {
                    // Change the group type
                    self.changeGroupType(groupid, grouptype);
                }
            });

            $("#addGroupbtn").before(html);
        }

        /*
            Removes the specified group and removes the appropriate HTML elements
        */

    }, {
        key: "removeGroup",
        value: function removeGroup(groupid) {
            groupid = parseInt(groupid);

            // we need to remove this pill
            $('li[groupid="' + groupid + '"]').remove();

            // set the previous group to active
            this.setGroupActive(groupid - 1);

            // we need to change the HTML groupid tags of the groups after this one
            if (groupid + 1 < this.courses.length) {
                // this is not the last group

                // decrement the groupid of every subsequent group
                for (var x = groupid + 1; x < this.courses.length; x++) {
                    $('li[groupid="' + x + '"]').attr("groupid", x - 1);
                }
            }

            // now we need to splice the array
            this.courses.splice(groupid, 1);

            // Check if we can display the add button again
            if (this.courses.length < 4) $("#addGroupbtn").show();

            // regenerate the schedules
            this.startGeneration();
        }

        /*
            Changes the type of a group type and updates the element
        */

    }, {
        key: "changeGroupType",
        value: function changeGroupType(id, type) {
            this.courses[id]["type"] = type;

            // Change the HTML
            $('li[groupid="' + id + '"]').find("a:first").html(this.numConvert[type] + ' of<span class="caret"></span>');

            this.startGeneration();
        }

        /*
            Sets the specified group to active
        */

    }, {
        key: "setGroupActive",
        value: function setGroupActive(id) {
            // remove old active class
            if (this.activeGroup != undefined) {
                $('li[groupid="' + this.activeGroup + '"]').removeClass("active");
            }

            this.activeGroup = id;
            $('li[groupid="' + id + '"]').addClass("active");

            // now display all the courses in the group
            this.displayGroup(this.activeGroup);
        }

        /*
            Populates the courses in the specified group
        */

    }, {
        key: "displayGroup",
        value: function displayGroup(group) {
            var self = this;

            // empty out any current courses
            $("#courseList").empty();

            for (var course in self.courses[self.activeGroup]["courses"]) {
                var course = self.courses[self.activeGroup]["courses"][course];

                self.displayCourse(course["obj"], course["obj"]["path"]);
            }
        }

        /*
            Generates the dropdown HTML for a group pill
        */

    }, {
        key: "generatePillDropdown",
        value: function generatePillDropdown(noremove) {
            var html = '';

            for (var x in this.numConvert) {
                html += '<li grouptype="' + x + '"><a>' + this.numConvert[x] + ' of</a></li>';
            }

            if (noremove != true) {
                html += '<li role="separator" class="divider"></li>';
                html += '<li grouptype="-1"><a>Remove</a></li>';
            }

            return html;
        }

        /*
            Expands the type name (LEC = Lecture, TUT = Tutorial)
        */

    }, {
        key: "typeExpand",
        value: function typeExpand(type) {
            var map = {
                "LEC": "Lecture",
                "TUT": "Tutorial",
                "LAB": "Lab",
                "SEM": "Seminar",
                "LCL": "Lecture/Lab",
                "LBL": "Lab/Lecture",
                "CLN": "Clinic",
                "DD": "Distance Delivery",
                "BL": "Blended Delivery",
                "WKT": "Work Term",
                "FLD": "Field Work",
                "PRC": "Practicum",
                "CLI": "Clinical",
                "IDS": "Internship"
            };

            if (map[type] != undefined) {
                return map[type];
            } else {
                return type;
            }
        }

        /*
            Deletes the given course in any group except the passed in one
        */

    }, {
        key: "deleteCourseFromNonSafe",
        value: function deleteCourseFromNonSafe(delcourse, safegroup) {
            // iterate the groups
            for (var group in this.courses) {
                if (group != safegroup) {
                    // we can delete in this group
                    for (var course in this.courses[group]["courses"]) {
                        if (course == delcourse) {
                            delete this.courses[group]["courses"][course];
                        }
                    }
                }
            }
        }

        /*
            Adds the specified course to the current active group and populates the HTML
        */

    }, {
        key: "addCourse",
        value: function addCourse(course, path, classid) {
            var self = this;

            // We want a separate copy of the obj to work on
            course = jQuery.extend({}, course);

            // add the path to the obj
            course["path"] = path;

            var subject = path.split("\\");

            var coursenum = subject[subject.length - 1]; // 203
            var subject = subject[subject.length - 2]; // CPSC

            var coursecode = subject + " " + coursenum; // CPSC 203


            // Add the key if it isn't there
            if (self.courses[self.activeGroup]["courses"][coursecode] == undefined) {
                self.courses[self.activeGroup]["courses"][coursecode] = {};
                self.courses[self.activeGroup]["courses"][coursecode]["types"] = {};

                // add the possible types
                for (var classv in course["classes"]) {
                    if (course["classes"][classv]["type"] != undefined) {
                        var thistype = course["classes"][classv]["type"];
                        self.courses[self.activeGroup]["courses"][coursecode]["types"][thistype] = true;
                    }
                }

                // check to see if any other groups have this course, is so, delete the course from them
                self.deleteCourseFromNonSafe(coursecode, self.activeGroup);

                self.displayCourse(course, path, undefined, true);
            }

            var thiscourse = self.courses[self.activeGroup]["courses"][coursecode];

            // set the course obj
            thiscourse["obj"] = course;

            if (classid != undefined) {
                var classtype = true;

                // figure out the class type
                for (var classv in course["classes"]) {
                    if (course["classes"][classv]["id"] == classid) {
                        classtype = course["classes"][classv]["type"];
                        break;
                    }
                }

                if (thiscourse["types"][classtype] != true) {
                    // update the class list button (remove the old class button)
                    window.classList.updateRemovedClass(thiscourse["types"][classtype]);
                }

                thiscourse["types"][classtype] = classid;

                // Update the accordion if its open
                self.updateAccordion(coursecode);

                // update the classlist buttons
                window.classList.updateAddedCourse(coursecode);
            }

            this.startGeneration();
        }

        /*
            Updates the data in the given open accordion
        */

    }, {
        key: "updateAccordion",
        value: function updateAccordion(course) {
            var self = this;

            // get the label
            var label = $('label[path="' + course + '"]');

            // Check if its open
            if (label.attr("accordopen") == "true") {
                // update it
                label.attr("accordopen", "false");
                label.parent().find("ul:first").slideUp(function () {
                    $(this).empty();
                    self.bindButton(label, "course");
                });
            }
        }

        /*
            Removes a course from the UI and courses obj
        */

    }, {
        key: "removeCourse",
        value: function removeCourse(course) {
            for (var group in this.courses) {
                var thisgroup = this.courses[group];

                if (thisgroup["courses"][course] != undefined) {

                    // Remove any remove class buttons since those classes are no longer added
                    for (var classval in thisgroup["courses"][course]["types"]) {
                        var thisclassval = thisgroup["courses"][course]["types"][classval];

                        if (thisclassval != true) {
                            window.classList.updateRemovedClass(thisclassval);
                        }
                    }

                    // Delete this course
                    delete thisgroup["courses"][course];

                    // check if its the active group
                    // if so, remove the UI element
                    if (group == this.activeGroup) {
                        var label = $('label[path="' + course + '"]');
                        label.parent().slideUp(function () {
                            $(this).empty();
                        });
                    }
                }
            }

            // Restart generation
            this.startGeneration();
        }

        /*
            Returns a boolean as to whether a specified course is in any selected group
        */

    }, {
        key: "hasCourse",
        value: function hasCourse(course) {
            for (var group in this.courses) {
                var thisgroup = this.courses[group];

                if (thisgroup["courses"][course] != undefined) {
                    return true;
                }
            }

            // We didn't find a result
            return false;
        }

        /*
            Returns a boolean as to whether the specified class id has been selected in any group
        */

    }, {
        key: "hasClass",
        value: function hasClass(classid) {
            for (var group in this.courses) {
                var thisgroup = this.courses[group];

                for (var course in thisgroup["courses"]) {
                    for (var classv in thisgroup["courses"][course]["types"]) {
                        if (thisgroup["courses"][course]["types"][classv] == classid) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        /*
            Removes the specified class from the UI and generation
        */

    }, {
        key: "removeClass",
        value: function removeClass(classid) {
            for (var group in this.courses) {
                var thisgroup = this.courses[group];

                for (var course in thisgroup["courses"]) {
                    for (var classv in thisgroup["courses"][course]["types"]) {
                        if (thisgroup["courses"][course]["types"][classv] == classid) {
                            thisgroup["courses"][course]["types"][classv] = true;

                            // update UI
                            this.updateAccordion(course);

                            // update the generation
                            this.startGeneration();

                            return true;
                        }
                    }
                }
            }

            return false;
        }

        /*
            Appends the given course to the current courselist HTML
        */

    }, {
        key: "displayCourse",
        value: function displayCourse(course, path, classid, animated) {
            var self = this;

            var html = "";
            if (classid == undefined) {
                html = $(this.generateCourseHTML(course, path));

                html.find("label").click(function (event) {
                    event.stopPropagation();
                    self.bindButton(this, "course");
                });

                // bind remove button
                html.find(".removeBtn").click(function (event) {
                    event.stopPropagation();

                    var coursecode = $(this).parent().attr("path");

                    // remove the course in My Courses
                    self.removeCourse(coursecode);

                    // we want to update the general course remove button
                    window.classList.updateRemovedCourse($(this).parent().attr("path"));
                });
            }

            if (animated) {
                html.hide().prependTo("#courseList").slideDown();
            } else {
                $("#courseList").prepend(html);
            }
        }

        /*
            Binds an accordion click
        */

    }, {
        key: "bindButton",
        value: function bindButton(button, type) {
            var self = this;

            // Onclick handler

            // do we need to close the element?
            if ($(button).attr("accordopen") == "true") {
                // Close the element
                $(button).attr("accordopen", "false");

                $(button).parent().find("ul").slideUp(function () {
                    $(this).empty();
                });
            } else {

                // Open accordion
                var thispath = $(button).attr("path");
                $(button).attr("accordopen", "true");

                var element = $(button).parent().find("ul");

                // Populate depending on type
                if (type == "course") {
                    // Element to populate
                    self.displayCourseDropDown(element, thispath);
                }
            }
        }

        /*
            Generates the dropdown when clicking on a course in MyCourses
        */

    }, {
        key: "displayCourseDropDown",
        value: function displayCourseDropDown(element, coursecode) {
            var self = this;

            element.slideUp(function () {

                var thiscourse = self.courses[self.activeGroup]["courses"][coursecode];

                // iterate through each class type
                for (var type in thiscourse["types"]) {
                    var thistype = thiscourse["types"][type];
                    if (thistype == true) {
                        // They don't have a specific selection, we'll have to generate it
                        var html = '<div class="accordiondesc" style="padding-left: 50px;" type="' + type + '">' + self.typeExpand(type) + '</div>';
                        element.append(html);
                    } else if (thistype != false) {
                        // this is a specific class

                        // find the obj of the class
                        var data = { "classes": [] };

                        for (var classv in thiscourse["obj"]["classes"]) {
                            var thisclass = thiscourse["obj"]["classes"][classv];
                            if (thisclass["id"] == thistype) {
                                // we found the obj for this class
                                data["classes"].push(thisclass);
                                break;
                            }
                        }

                        if (data["classes"].length > 0) {
                            // generate the table
                            var html = window.classList.generateClasses(data, element, false, false);

                            // add the remove button
                            var removebtn = $('<td><button class="btn btn-default" id="removeClassBtn" type="' + type + '" code="' + coursecode + '" myclassid="' + data["classes"][0]["id"] + '">×</button></td>');

                            // bind class removing button
                            removebtn.find("button").click(function (event) {
                                event.stopPropagation();
                                var type = $(this).attr("type");
                                var coursecode = $(this).attr("code");

                                // set to generic class
                                self.courses[self.activeGroup]["courses"][coursecode]["types"][type] = true;

                                // update the class list
                                window.classList.updateRemovedClass($(this).attr("myclassid"));

                                // update UI
                                self.updateAccordion(coursecode);

                                // update the generation
                                self.startGeneration();
                            });

                            html.find("tr:first").append(removebtn);
                            // <div class="removeBtn">×</div>

                            // edit the css
                            html.css("padding-left", "50px");
                            html.css("padding-right", "15px");
                        }
                    }
                }

                element.slideDown();
            });
        }

        /*
            Initiates schedule generation given the current chosen classes
        */

    }, {
        key: "startGeneration",
        value: function startGeneration() {
            // we want to terminate the previous generator if its still running
            if (this.generator != false) this.generator.stop();

            // generate the schedules
            this.generator = new Generator(this.courses);

            // save the current state to localStorage
            this.saveState();
        }

        /*
            Generates the course HTML
        */

    }, {
        key: "generateCourseHTML",
        value: function generateCourseHTML(course, path) {
            var subject = path.split("\\");
            var coursenum = subject[subject.length - 1];
            var subject = subject[subject.length - 2];

            var title = subject + " " + coursenum;

            if (course["description"] != undefined && course["description"]["name"] != undefined) {
                title += " - " + course["description"]["name"];
            }

            return this.generateAccordionHTML(title, subject + " " + coursenum);
        }

        /*
            Generates the course remove button HTML
        */

    }, {
        key: "generateRemoveButton",
        value: function generateRemoveButton() {
            return '<button class="btn btn-default">&times;</button>';
        }

        /*
            Generates the general accordian structure HTML given a value
        */

    }, {
        key: "generateAccordionHTML",
        value: function generateAccordionHTML(value, path) {
            return '<li class="has-children"><label path="' + path + '" accordopen="false">' + value + '<div class="removeBtn">×</div></label><ul></ul></li>';
        }
    }]);

    return MyCourses;
}();
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Preferences = function () {
    function Preferences() {
        _classCallCheck(this, Preferences);

        this.instantiateSliders();
        this.loadPreferences();

        // Update the Uni, remove needless options on start
        this.updatedUni();
    }

    _createClass(Preferences, [{
        key: 'instantiateSliders',
        value: function instantiateSliders() {
            var self = this;

            self.morningslider = $('#slider_morning').slider().on('slideStop', function () {
                self.savePreferences();
            });

            self.nightslider = $('#slider_night').slider().on('slideStop', function () {
                self.savePreferences();
            });
            self.consecutiveslider = $('#slider_consecutive').slider().on('slideStop', function () {
                self.savePreferences();
            });
            self.rmpslider = $('#slider_rmp').slider().on('slideStop', function () {
                self.savePreferences();
            });

            // Bind checkbox change event
            $("#onlyOpenCheckbox").change(function () {
                self.savePreferences();
            });

            // Bind Engineering student change event
            $("#engineeringCheckbox").change(function () {
                self.savePreferences(true);
            });

            // Initialize tooltip for engineering checkbox
            $("#engineeringCheckboxTooltip").tooltip();
        }

        /*
            Hides/shows different preferences based upon the current uni selected
        */

    }, {
        key: 'updatedUni',
        value: function updatedUni(newuni) {
            $("#engineeringCheckbox").parent().hide();

            if (newuni == "UAlberta") {
                $("#engineeringCheckbox").parent().show();
            }
        }
    }, {
        key: 'getMorningValue',
        value: function getMorningValue() {
            return this.morningslider.slider('getValue');
        }
    }, {
        key: 'getNightValue',
        value: function getNightValue() {
            return this.nightslider.slider('getValue');
        }
    }, {
        key: 'getConsecutiveValue',
        value: function getConsecutiveValue() {
            return this.consecutiveslider.slider('getValue');
        }
    }, {
        key: 'getRMPValue',
        value: function getRMPValue() {
            return this.rmpslider.slider('getValue');
        }
    }, {
        key: 'getOnlyOpenValue',
        value: function getOnlyOpenValue() {
            return $("#onlyOpenCheckbox").is(":checked");
        }
    }, {
        key: 'getEngineeringValue',
        value: function getEngineeringValue() {
            return $('#engineeringCheckbox').is(':checked');
        }
    }, {
        key: 'setMorningValue',
        value: function setMorningValue(value) {
            if (value != null) this.morningslider.slider('setValue', parseInt(value));
        }
    }, {
        key: 'setNightValue',
        value: function setNightValue(value) {
            if (value != null) this.nightslider.slider('setValue', parseInt(value));
        }
    }, {
        key: 'setConsecutiveValue',
        value: function setConsecutiveValue(value) {
            if (value != null) this.consecutiveslider.slider('setValue', parseInt(value));
        }
    }, {
        key: 'setRMPValue',
        value: function setRMPValue(value) {
            if (value != null) this.rmpslider.slider('setValue', parseInt(value));
        }
    }, {
        key: 'setOnlyOpenValue',
        value: function setOnlyOpenValue(value) {
            if (value != null) $("#onlyOpenCheckbox").attr("checked", value === "true");
        }
    }, {
        key: 'setEngineeringValue',
        value: function setEngineeringValue(value) {
            if (value != null) $("#engineeringCheckbox").attr("checked", value === "true");
        }

        /*
            Saves the current slider values to localStorage
        */

    }, {
        key: 'savePreferences',
        value: function savePreferences(regenerate) {
            localStorage.setItem('morningslider', this.getMorningValue());
            localStorage.setItem('nightslider', this.getNightValue());
            localStorage.setItem('consecutiveslider', this.getConsecutiveValue());
            localStorage.setItem('rmpslider', this.getRMPValue());
            localStorage.setItem('onlyOpenCheckbox', this.getOnlyOpenValue());
            localStorage.setItem('engineeringCheckbox', this.getEngineeringValue());

            // update any current schedule generation
            if (window.mycourses.generator != false) {
                if (regenerate != true) {
                    // update the scores
                    window.mycourses.generator.updateScores();
                } else {
                    window.mycourses.startGeneration();
                }
            }
        }

        /*
            If there are saved preferences in localStorage, this loads them
        */

    }, {
        key: 'loadPreferences',
        value: function loadPreferences() {
            this.setMorningValue(localStorage.getItem('morningslider'));
            this.setNightValue(localStorage.getItem('nightslider'));
            this.setConsecutiveValue(localStorage.getItem('consecutiveslider'));
            this.setRMPValue(localStorage.getItem('rmpslider'));
            this.setOnlyOpenValue(localStorage.getItem('onlyOpenCheckbox'));
            this.setEngineeringValue(localStorage.getItem('engineeringCheckbox'));
        }
    }]);

    return Preferences;
}();
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Tutorial = function () {
	function Tutorial() {
		_classCallCheck(this, Tutorial);

		var self = this;

		// check localstorage to see whether we should start the tut or not
		if (localStorage.getItem("tour_end") == null && window.tourInProgress != true) {
			// Set a global defining our progress
			window.tourInProgress = true;

			setTimeout(function () {
				self.openAccordion();
			}, 500);
		}
	}

	/*
 	Open the first top level for every level
 */


	_createClass(Tutorial, [{
		key: 'openAccordion',
		value: function openAccordion() {
			this.openedAccordion = true;

			this.openChildRow($('#classdatawraper').children(0));
		}

		/*
  	Opens the first row in the child of the specified element
  */

	}, {
		key: 'openChildRow',
		value: function openChildRow(element) {
			var self = this;

			// Get the row
			var row = element.parent().find('.has-children').eq(0);

			if (row.length > 0) {

				// Ensure the row isn't open already, if not, click it
				if (row.find("ul").length == 1 && row.find(".accordiontableparent").length == 0) row.find('label').click();

				// Call the next row
				setTimeout(function () {
					self.openChildRow(row.find('label').eq(0));
				}, 50);
			} else {
				// start up the tour
				self.createIntro();
			}
		}

		/*
  	Initialize and start the tour
  */

	}, {
		key: 'createIntro',
		value: function createIntro() {
			var self = this;

			var tour = new Tour({
				steps: [{
					title: "What is this?",
					content: "Schedule Storm is a student schedule generator that lets you input your courses and preferences to generate possible schedules. <br><br>You can always restart this tour by going to preferences"
				}, {
					element: document.querySelector('#classdatawraper'),
					title: "Course List",
					content: "In this accordion, you can add and look at courses. Clicking on labels opens their contents."
				}, {
					element: $("#classdatawraper").find('.addCourseButton')[0],
					title: "Add Courses",
					content: "If you want to add a course, simply click on the 'plus' icon next to its name"
				}, {
					element: $("#classdatawraper").find('[classid]')[0],
					title: "Add Specific Classes",
					content: "If you want to add a specific class, you can click on the 'plus' icon next to it.<br><br>All other required classes will automatically be filled by the generator"
				}, {
					element: $("#classdatawraper").find("td")[1],
					title: "Rate My Professor Ratings",
					content: "If you see a number beside a teacher's name, that is their Rate My Professor rating out of 5<br><br>You can specify the weighting of the RMP rating in the generator in preferences"
				}, {
					element: $("#searchcourses")[0],
					title: "Search Courses",
					content: "Here you can search for teachers, courses, classes, rooms, descriptions, faculties, subjects, prerequisites...<br><br>Almost anything!"
				}, {
					element: $("#locationselect")[0],
					title: "Change Location",
					content: "You can limit the location for classes to specific campuses or areas"
				}, {
					element: $("#courseSelector").find(".input-group-btn")[1],
					title: "Change Term",
					content: "You can change the term you're viewing in this university"
				}, {
					element: $("#MyCourses"),
					title: "My Courses",
					content: "All of your chosen courses are displayed here",
					placement: "left"
				}, {
					element: $("#coursegroups"),
					title: "Course Groups",
					content: "You can create groups of courses where the generator fulfills every group. You can change/remove the group type by clicking on its 'pill'"
				}, {
					element: $("#addGroupbtn"),
					title: "Adding Course Groups",
					content: "Clicking this will create a new course group<br><br>This is useful for electives where you only want one or two of the courses selected in the group"
				}, {
					element: $("#schedule"),
					title: "Calendar",
					content: "You can look through possible schedules on this calendar",
					placement: "left"
				}, {
					element: $("#calendarStatus"),
					title: "Blocking Timeslots",
					content: "You can block specific timeslots for the generator by clicking and dragging on the calendar<br><br>Clicking on a banned timeslot will unban it",
					placement: "left"
				}, {
					element: $("#prevSchedule"),
					title: "Browsing Schedules",
					content: "You can browse possible schedules by clicking the previous and next buttons here",
					placement: "left"
				}, {
					element: $("#scheduleutilities"),
					title: "Schedule Utilities",
					content: "Useful schedule utilities can be found here, you can:<br>* Download a picture of your schedule<br>* Copy your schedule to clipboard<br>* Remove all blocked timeslots<br>* Share your schedule to Facebook"
				}, {
					element: $("#preferencesbutton"),
					title: "Preferences",
					content: "You can change your schedule preferences and edit settings by clicking this button<br><br>You can change your preferences for morning/night classes, consecutive classes, and teacher quality over time slots.<br><br>You can also specify that you only want the generator to allow open classes (some universities have custom settings)",
					placement: "left"
				}, {
					element: $("#MyUniversity"),
					title: "Change University",
					content: "You can click here to open a dropdown and change your university",
					placement: "left"
				}, {
					element: $("#aboutbutton"),
					title: "About Us",
					content: "We are two Computer Science students that thought there was a better way to make university schedules<br><br>Please contact us using Github or Email if you'd like to say 'Hi', file a bug report, want us to add your university, or add a new feature!",
					placement: "left"
				}, {
					title: "That ended too soon!",
					content: "It looks like thats the end of our tour, remember you can always look at it again by going to preferences.<br><br>This project is completely open-source on Github and if you want to implement your university or add a feature, please do it!"
				}],
				backdrop: true,
				orphan: true,
				onEnd: function onEnd(tour) {
					window.tourInProgress = false;
				}
			});

			// Initialize the tour
			tour.init();

			// Start the tour
			tour.start().goTo(0);
		}
	}]);

	return Tutorial;
}();
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Welcome = function () {
    function Welcome() {
        _classCallCheck(this, Welcome);

        this.baseURL = "http://api.schedulestorm.com:5000/v1/";

        // We want to get the list of Unis
        this.getUnis();
    }

    /*
        Obtains the University list from the API server 
    */


    _createClass(Welcome, [{
        key: "getUnis",
        value: function getUnis() {
            // empty the parent
            $("#uniModalList").find("#dataList").empty();

            var thisobj = this;

            $("#welcomeModal").modal({
                backdrop: 'static',
                keyboard: false
            });

            // Add the loading animation
            var loading = new Loading($("#uniModalList").find("#dataList"), "Loading University Data...");

            $.getJSON(this.baseURL + "unis", function (data) {
                // remove the loading animation
                loading.remove(function () {
                    // Populate the dropdown in the top right
                    thisobj.populateUniDropdown(data);

                    window.unis = data;
                    thisobj.unis = data;

                    var localUni = localStorage.getItem("uni");
                    var localTerm = localStorage.getItem("term");

                    // Check to see if they have already selected a Uni and Term in localstorage
                    if (thisobj.unis[localUni] != undefined && thisobj.unis[localUni]["terms"][localTerm] != undefined) {
                        // Hide the modal
                        $("#welcomeModal").modal('hide');

                        // Set this uni
                        thisobj.uni = localUni;

                        // Populate the top right dropdown
                        $("#MyUniversity").hide().html(thisobj.unis[thisobj.uni]["name"] + " <span class='caret'></span>").fadeIn('slow');

                        // Load up the classes
                        window.classList = new ClassList(localUni, localTerm);
                        window.mycourses = new MyCourses(localUni, localTerm);
                    } else {
                        $("#uniModalList").find("#dataList").hide();

                        // New user with nothing selected, show them welcome prompts
                        thisobj.populateUnis(data);
                    }
                });
            });
        }

        /*
            Populates the top right university dropdown (when the modal isn't showing) and handles the click events
        */

    }, {
        key: "populateUniDropdown",
        value: function populateUniDropdown(data) {
            var self = this;

            // Get the dropdown element
            var dropdown = $("#MyUniversity").parent().find('.dropdown-menu');

            for (var uni in data) {
                // Add this Uni to the dropdown

                var uniobj = data[uni];
                var html = $('<li class="dropdown-items"><a uni="' + uni + '">' + uniobj["name"] + '</a></li>');

                // Bind an onclick event to it
                html.click(function () {

                    // Get the selected uni code (UCalgary, etc...)
                    self.uni = $(this).find("a").attr("uni");

                    // Change the text of the element
                    $("#MyUniversity").hide().html(self.unis[self.uni]["name"] + " <span class='caret'></span>").fadeIn('slow');

                    // Make sure the modal is active
                    $("#welcomeModal").modal({
                        backdrop: 'static',
                        keyboard: false
                    });

                    // Let the user choose what term they want
                    self.displayTerms(self.uni);
                });

                // Append it
                dropdown.append(html);
            }
        }

        /*
            Populates the modal with the Unis
        */

    }, {
        key: "populateUnis",
        value: function populateUnis(unis) {
            var thisobj = this;

            var list = $("#uniModalList").find("#dataList");
            var wantedText = $("#uniModalList").find("#wantedData");

            wantedText.text("Please choose your University:");

            // Iterate through the unis and add the buttons
            for (var uni in unis) {
                var button = $(this.createButton(unis[uni]["name"], uni));
                button.click(function () {

                    thisobj.uni = $(this).attr("value");

                    $("#MyUniversity").hide().html($(this).text() + " <span class='caret'></span>").fadeIn('slow');

                    $("#uniModalList").slideUp(function () {
                        thisobj.displayTerms(thisobj.uni);
                    });
                });

                list.append(button);
            }

            list.append("<br><a href='https://github.com/Step7750/ScheduleStorm#supported-universities'>Don't see your school? Tell Us!</a>");

            list.slideDown();
        }

        /*
            Displays the terms to the user
        */

    }, {
        key: "displayTerms",
        value: function displayTerms(uni) {
            var thisobj = this; // Keep the reference

            var list = $("#uniModalList").find("#dataList");
            list.empty();
            var wantedText = $("#uniModalList").find("#wantedData");

            wantedText.text("Please choose your term:");

            for (var term in this.unis[uni]["terms"]) {
                var button = $(this.createButton(this.unis[uni]["terms"][term], term));

                button.click(function () {

                    thisobj.term = $(this).attr("value");

                    window.classList = new ClassList(thisobj.uni, thisobj.term);
                    window.mycourses = new MyCourses(thisobj.uni, thisobj.term);

                    // reset the calendar
                    window.calendar.resetCalendar();

                    // hide the modal
                    $("#welcomeModal").modal('hide');
                });
                list.append(button);
            }

            $("#uniModalList").slideDown();
        }

        /*
            Returns the text for an HTML button given text, value
        */

    }, {
        key: "createButton",
        value: function createButton(text, value) {
            return '<button type="button" class="btn btn-default" value="' + value + '">' + text + '</button>';
        }
    }]);

    return Welcome;
}();
