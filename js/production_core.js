"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Calendar = function () {
    // Handles the UI construction of the calendar
    function Calendar() {
        var _this = this;

        _classCallCheck(this, Calendar);

        this.weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
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
        this.removeTimes = false;
        this.isLoading = false;
        this.currentSchedule = [];

        this.resetCalendar();
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

        // We want to bind the mouse up handler for blocking times
        $(document).mouseup(function () {
            _this.mouseDown = false;

            // Change each deep array to strings for comparison
            var blockedTimesString = JSON.stringify(_this.blockedTimes);
            var prevBlockedTimesString = JSON.stringify(_this.prevBlockedTimes);

            // Check if the blocked times changed, if so, restart generation
            if (blockedTimesString != prevBlockedTimesString) {
                window.mycourses.startGeneration();
            }

            // Reset prev
            _this.prevBlockedTimes = _this.blockedTimes;
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
            var _this2 = this;

            var resizeTimer = void 0;

            $(window).resize(function () {
                if (resizeTimer) clearTimeout(resizeTimer);

                resizeTimer = setTimeout(function () {
                    return _this2.redrawSchedule();
                }, 500);
            });
        }

        /*
            Binds the Schedule Photo Download button and implements the DL functionality
        */

    }, {
        key: "bindSchedulePhotoDL",
        value: function bindSchedulePhotoDL() {
            var _this3 = this;

            $("#dlSchedulePhoto").click(function () {
                // Take the screenshot
                _this3.takeCalendarHighResScreenshot(1.6, 2, function (canvas) {
                    // Download the picture
                    var a = document.createElement('a');
                    a.href = canvas.replace("image/png", "image/octet-stream");

                    // Set the name of the file
                    if (window.uni && window.term) a.download = window.uni + "_" + window.term + "_ScheduleStorm.png";else a.download = 'ScheduleStorm_Schedule.png';

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
            var _this4 = this;

            $("#uploadToImgur").click(function () {
                /*
                    Why do we make a separate window/tab now?
                      If we simply open up a new window/tab after we already have the photo uploaded
                    and the imgur link, we lose the "trusted" event that came from a user click. 
                    As a result, the window/tab would be blocked as a popup. If we create the window
                    now while we have a trusted event and then change its location when we're ready, 
                    we can bypass this.
                */
                var imgurWindow = window.open("http://schedulestorm.com/assets/imgurloading.png", 'Uploading to Imgur...', "width=900,height=500");

                // Upload the image to imgur and get the link
                _this4.uploadToImgur(1.6, function (link) {
                    if (link) imgurWindow.location.href = link;else imgurWindow.location.href = "http://schedulestorm.com/assets/imgurerror.png"; // error
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
            // Takes a screenshot of the calendar
            this.takeCalendarHighResScreenshot(ratio, 2, function (canvas) {
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
                    return cb(data.data.link);
                }).error(function () {
                    return cb(false);
                });
            });
        }

        /*
            Binds the Facebook share button to actually share on click
        */

    }, {
        key: "bindFacebookSharing",
        value: function bindFacebookSharing() {
            var _this5 = this;

            $("#shareToFacebook").click(function () {
                // We have to preserve this "trusted" event and thus have to make the window now
                var facebookWindow = window.open("http://schedulestorm.com/assets/facebookshare.png", "Sharing to Facebook...", "width=575,height=592");

                _this5.uploadToImgur(1.91, function (link) {
                    // Set the default image if no image
                    if (!link) link = "https://camo.githubusercontent.com/ac09e7e7a60799733396a0f4d496d7be8116c542/6874747" + "03a2f2f692e696d6775722e636f6d2f5a425258656d342e706e67";

                    facebookWindow.location.href = _this5.generateFacebookFeedURL(link);
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

            if (schedule.length === 0) return returnText;

            returnText += " --- Classes: ";

            var coursesDict = {};

            // Iterate through each class and populate the course dict
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = schedule[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var thisClass = _step.value;

                    if ((typeof thisClass === "undefined" ? "undefined" : _typeof(thisClass)) !== "object") continue;

                    if (coursesDict[thisClass["name"]] === undefined) coursesDict[thisClass["name"]] = [];

                    coursesDict[thisClass["name"]].push(thisClass["id"]);
                }

                // Iterate through the dict keys and add the values to the returnText
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            var dictLength = Object.keys(coursesDict).length;
            var index = 0;

            for (var key in coursesDict) {
                index += 1;
                returnText += key + " (" + coursesDict[key] + ")";

                if (index < dictLength) returnText += ", ";
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
            var _this6 = this;

            var srcEl = document.getElementById("maincalendar");
            var wrapdiv = $(srcEl).find('.wrap');
            var beforeHeight = wrapdiv.height();

            // Want to remove any scrollbars
            wrapdiv.removeClass('wrap');

            // If removing the size caused the rows to be smaller, add the class again
            if (beforeHeight > wrapdiv.height()) wrapdiv.addClass('wrap');

            // Save original size of element
            var originalWidth = srcEl.offsetWidth;
            var originalHeight = wrapdiv.height() + $(srcEl).find("table").eq(0).height();

            // see if we can scale the width for it to look right for the aspect ratio
            if (originalHeight * aspectratio <= $(window).width()) originalWidth = originalHeight * aspectratio;

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

                _this6.redrawSchedule();

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
            var _this7 = this;

            $("#removeBlockedTimes").click(function () {
                // Make sure there are actually blocked times before regenning
                if (JSON.stringify(_this7.blockedTimes) == "[]") return;

                _this7.blockedTimes = [];
                _this7.prevBlockedTimes = [];

                // Visually remove all of the blocked times
                _this7.removeAllBlockedTimeUI();

                window.mycourses.startGeneration();
            });
        }

        /*
            Binds the copy schedule to clipboard button
        */

    }, {
        key: "bindCopyScheduleToClipboard",
        value: function bindCopyScheduleToClipboard() {
            var _this8 = this;

            new Clipboard('#copySchedToClipboard', {
                text: function text() {
                    return _this8.generateScheduleText(_this8.currentSchedule);
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
            if (this.isLoading) return;

            this.loading = new Loading($("#schedule").find(".wrap:first"), message, "position: absolute; top: 20%; left: 40%;");
            this.isLoading = true;
        }

        /*
            If there is a loading animation, stops it
        */

    }, {
        key: "doneLoading",
        value: function doneLoading(cb) {
            var _this9 = this;

            if (this.isLoading) {
                this.loading.remove(function () {
                    _this9.isLoading = false;
                    cb();
                });
            } else {
                this.isLoading = false;
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
            // set the score, make sure its a number
            if (typeof schedule[0] == "number") $("#scheduleScore").text(schedule[0].toFixed(2));

            // Destroy all the tooltips from previous events
            this.destroyEventTooltips();

            // Clear all the current events on the calendar
            this.clearEvents();

            this.currentSchedule = schedule;
            this.setScheduleConstraints(schedule);

            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = schedule[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var thisClass = _step2.value;

                    if (!thisClass.times) continue;

                    var text = thisClass["name"] + " - " + thisClass["type"] + " - " + thisClass["id"];

                    var _iteratorNormalCompletion3 = true;
                    var _didIteratorError3 = false;
                    var _iteratorError3 = undefined;

                    try {
                        for (var _iterator3 = thisClass["times"][Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                            var thisTime = _step3.value;

                            // make sure there isn't a -1 in the days
                            if (thisTime[0].indexOf(-1) === -1) {
                                this.addEvent(Generator.totalMinutesToTime(thisTime[1][0]), Generator.totalMinutesToTime(thisTime[1][1]), thisTime[0], text, thisClass);
                            }
                        }
                    } catch (err) {
                        _didIteratorError3 = true;
                        _iteratorError3 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion3 && _iterator3.return) {
                                _iterator3.return();
                            }
                        } finally {
                            if (_didIteratorError3) {
                                throw _iteratorError3;
                            }
                        }
                    }
                }

                // reset the colour ids
            } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion2 && _iterator2.return) {
                        _iterator2.return();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }

            this.resetColours();
        }

        /*
            Redraws the current schedule
        */

    }, {
        key: "redrawSchedule",
        value: function redrawSchedule() {
            if (this.currentSchedule.length > 0) this.displaySchedule(this.currentSchedule);
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
            var returnText = "Generated by ScheduleStorm.com for " + window.unis[window.uni]["name"] + " \n                        " + window.unis[window.uni]["terms"][window.term] + " \n\n";

            if (schedule.length === 0) {
                returnText += "There were no possible schedules generated :(";
                return returnText;
            }

            // Iterate through each class and populate the return Text
            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {
                for (var _iterator4 = schedule[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                    var thisClass = _step4.value;

                    var thisRow = "";

                    if (typeof thisClass === "number") continue;

                    // Fill up the row with the correct formatting and order of attributes
                    if (thisClass.id) thisRow += thisClass.id + " | ";
                    if (thisClass.name) thisRow += thisClass.name + " | ";

                    if (thisClass.section) thisRow += thisClass.type + " - " + thisClass.section + " (" + thisClass.id + ") | ";else if (thisClass.group) thisRow += thisClass.type + " - " + thisClass.group + " (" + thisClass.id + ") | ";

                    thisRow += thisClass.teachers + " | ";
                    thisRow += thisClass.rooms + " | ";
                    thisRow += thisClass.oldtimes + " | ";
                    thisRow += thisClass.status;

                    // Add the row if it was actually populated
                    if (thisRow) returnText += thisRow + "\n";
                }
            } catch (err) {
                _didIteratorError4 = true;
                _iteratorError4 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion4 && _iterator4.return) {
                        _iterator4.return();
                    }
                } finally {
                    if (_didIteratorError4) {
                        throw _iteratorError4;
                    }
                }
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
        value: function getEventColour(className) {
            // check if we already have a colour for this class
            for (var colour in this.eventcolours) {
                if (this.eventcolours[colour] === className) return colour;
            }

            // add a new colour for this class
            for (var _colour in this.eventcolours) {
                if (this.eventcolours[_colour] === false) {
                    this.eventcolours[_colour] = className;
                    return _colour;
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

            var _iteratorNormalCompletion5 = true;
            var _didIteratorError5 = false;
            var _iteratorError5 = undefined;

            try {
                for (var _iterator5 = schedule[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                    var thisClass = _step5.value;

                    if (!thisClass.times) continue;

                    var _iteratorNormalCompletion6 = true;
                    var _didIteratorError6 = false;
                    var _iteratorError6 = undefined;

                    try {
                        for (var _iterator6 = thisClass.times[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                            var thisTime = _step6.value;

                            // make sure there isn't a -1 in the days
                            if (thisTime[0].indexOf(-1) !== -1) continue;

                            var thisMaxDay = Math.max.apply(null, thisTime[0]);

                            if (thisMaxDay > maxDay) maxDay = thisMaxDay;

                            // check whether these times change the constraints
                            var startTime = Generator.totalMinutesToTime(thisTime[1][0]);
                            var startHour = parseInt(startTime.split(":")[0]);

                            if (startHour < minHour) minHour = startHour;

                            var endTime = Generator.totalMinutesToTime(thisTime[1][1]);
                            var endHour = parseInt(endTime.split(":")[0]) + 1;

                            if (endHour > maxHour) maxHour = endHour;
                        }
                    } catch (err) {
                        _didIteratorError6 = true;
                        _iteratorError6 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion6 && _iterator6.return) {
                                _iterator6.return();
                            }
                        } finally {
                            if (_didIteratorError6) {
                                throw _iteratorError6;
                            }
                        }
                    }
                }

                // If nothing changed, set default
            } catch (err) {
                _didIteratorError5 = true;
                _iteratorError5 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion5 && _iterator5.return) {
                        _iterator5.return();
                    }
                } finally {
                    if (_didIteratorError5) {
                        throw _iteratorError5;
                    }
                }
            }

            if (maxDay === 4 && minDay === 0 && minHour === 24 && maxHour === 0) this.resizeCalendar(0, 4, 9, 17);else this.resizeCalendar(minDay, maxDay, minHour, maxHour);
        }

        /*
            Sets the current generated index
        */

    }, {
        key: "setCurrentIndex",
        value: function setCurrentIndex(index) {
            if (index > this.totalGenerated - 1) index = 0;
            if (index < 0) index = this.totalGenerated - 1;

            this.curIndex = index;

            // show it on the UI
            this.updateIndexUI(this.curIndex + 1);
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
            Sets the total amount of generated schedules for the UI and logistically
        */

    }, {
        key: "setTotalGenerated",
        value: function setTotalGenerated(total) {
            this.totalGenerated = total;
            this.updateTotalUI(this.totalGenerated);
        }

        /*
            Goes to the previous schedule
        */

    }, {
        key: "goToPrev",
        value: function goToPrev() {
            if (this.totalGenerated === 0) return;

            this.setCurrentIndex(this.curIndex - 1);

            // get the schedule
            var newSchedule = window.mycourses.generator.getSchedule(this.curIndex);
            if (newSchedule) this.displaySchedule(newSchedule);
        }

        /*
            Goes to the next schedule
        */

    }, {
        key: "goToNext",
        value: function goToNext() {
            if (this.totalGenerated === 0) return;

            this.setCurrentIndex(this.curIndex + 1);

            // get the schedule
            var newSchedule = window.mycourses.generator.getSchedule(this.curIndex);
            if (newSchedule) this.displaySchedule(newSchedule);
        }

        /*
            Binds the buttons that let you go through each generated schedule
        */

    }, {
        key: "bindNextPrev",
        value: function bindNextPrev() {
            var _this10 = this;

            // unbind any current binds
            $("#prevSchedule").unbind();
            $("#nextSchedule").unbind();

            $("#prevSchedule").click(function () {
                return _this10.goToPrev();
            });
            $("#nextSchedule").click(function () {
                return _this10.goToNext();
            });
        }

        /*
            Binds the arrow keys and Ctrl+C
        */

    }, {
        key: "keyBinds",
        value: function keyBinds() {
            var _this11 = this;

            // Bind arrow keys
            $(document).on('keydown', function (e) {
                var tag = e.target.tagName.toLowerCase();

                // We don't want to do anything if they have an input focused or a tour
                if (tag === "input" || window.tourInProgress) return;

                if (e.keyCode === 37) _this11.goToPrev();else if (e.keyCode === 39) _this11.goToNext();else if (e.keyCode === 67 && (e.metaKey || e.ctrlKey)) $("#copySchedToClipboard").click();
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
            var _iteratorNormalCompletion7 = true;
            var _didIteratorError7 = false;
            var _iteratorError7 = undefined;

            try {
                for (var _iterator7 = allowedAttributes[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                    var attribute = _step7.value;

                    // Make sure its id is defined in the class
                    if (!classobj[attribute.id]) continue;

                    htmlString += "<b style='font-weight: bold;'>" + attribute.name + "</b>: ";

                    if (_typeof(classobj[attribute.id]) !== "object") {
                        // just add the attribute
                        htmlString += classobj[attribute.id] + "<br>";
                        continue;
                    }

                    // Iterate through the object
                    htmlString += "<br>";

                    // Prevent dupes
                    var alreadyAdded = [];

                    for (var index in classobj[attribute.id]) {
                        var elem = classobj[attribute.id][index];

                        // Check if we've already added this element
                        if (alreadyAdded.indexOf(elem) !== -1) continue;

                        htmlString += elem;

                        if (attribute["id"] === "teachers" && classList.rmpdata[elem] && classList.rmpdata[elem]["rating"]) {
                            // This teacher has an RMP score, add it
                            htmlString += " (" + classList.rmpdata[elem]["rating"] + ")";
                        }

                        htmlString += "<br>";

                        // push it to added elements
                        alreadyAdded.push(elem);
                    }
                }
            } catch (err) {
                _didIteratorError7 = true;
                _iteratorError7 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion7 && _iterator7.return) {
                        _iterator7.return();
                    }
                } finally {
                    if (_didIteratorError7) {
                        throw _iteratorError7;
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
            var rowHeight = $("#schedule").find("td:first").height() + 1;
            var startHour = parseInt(starttime.split(":")[0]);
            var startMin = parseInt(starttime.split(":")[1]);
            var endHour = parseInt(endtime.split(":")[0]);
            var endMin = parseInt(endtime.split(":")[1]);

            // round down to closest 30min or hour
            var roundedStartMin = Math.floor(startMin / 30) * 30;

            // figure out how many minutes are in between the two times
            var totalStartMin = startHour * 60 + startMin;
            var totalEndMin = endHour * 60 + endMin;

            var totalMin = totalEndMin - totalStartMin;

            // Calculate the height of the box
            var totalHeight = totalMin / 30 * rowHeight;

            // calculate how far from the top the element is
            var topOffset = startMin % 30 / 30 * rowHeight;

            // draw the events
            var _iteratorNormalCompletion8 = true;
            var _didIteratorError8 = false;
            var _iteratorError8 = undefined;

            try {
                for (var _iterator8 = days[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                    var day = _step8.value;

                    // find the parent
                    var tdElement = $("#schedule").find("#" + startHour + "-" + roundedStartMin);
                    tdElement = tdElement.find("td:eq(" + (day + 1) + ")");

                    // empty it
                    tdElement.empty();

                    var eventColour = this.getEventColour(classobj.name);
                    var tooltipText = this.generateTooltip(classobj);

                    var html = "<div class=\"event\" style=\"height: " + totalHeight + "px; top: " + topOffset + "px; \n                        background: " + eventColour + ";\" data-toggle=\"tooltip\" title=\"" + tooltipText + "\">\n                            " + text + "\n                        </div>";

                    // Initialize the tooltip
                    html = $(html).tooltip({ container: 'body', html: true });

                    tdElement.append(html);
                }
            } catch (err) {
                _didIteratorError8 = true;
                _iteratorError8 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion8 && _iterator8.return) {
                        _iterator8.return();
                    }
                } finally {
                    if (_didIteratorError8) {
                        throw _iteratorError8;
                    }
                }
            }
        }

        /*
            Resizes the calendar to the specified constraints
        */

    }, {
        key: "resizeCalendar",
        value: function resizeCalendar(startDay, endDay, startHour, endHour) {
            var self = this;

            // If the difference between the start and end hours is less than 6, extend the end hour
            // This is to make sure the appearance of the calendar doesn't look weird and
            // that every row is 20px high

            if (endHour - startHour < 6) endHour += 6 - (endHour - startHour);
            if (endHour > 24) endHour = 24;

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
                var hourText = "";

                if (min == 0) hourText += hours12 + ":00";

                // generate the text
                table += "\n                <tr id=\"" + hour + "-" + min + "\">\n                    <td class=\"headcol\">" + hourText + "</td>\n            ";

                var iterateLength = endDay - startDay + 1;

                for (var _x = 0; _x < iterateLength; _x++) {
                    var blockedTimeClass = "";

                    if (this.blockedTimes[_x] && this.blockedTimes[_x].indexOf(hour + "-" + min) > -1) {
                        blockedTimeClass = "blockedTime";
                    }

                    table += "<td day=\"" + _x + "\" class=\"" + blockedTimeClass + "\"></td>";
                }

                table += "</tr>";

                min += 30;
            }

            table += '</tbody></table></div>';

            table = $(table);

            // bind the blocked times mouse events 
            table.find("td:not(.headcol)").mousedown(function () {
                /*
                If the first block you mouse down on causes a certain event,
                you can only cause that event when hovering over other blocks
                  Ex. If you start of removing a time block, you can only remove
                other timeblocks when you hover
                */

                // Preserve the old copy of the blocked times for the mouseUp document event
                self.prevBlockedTimes = jQuery.extend(true, [], self.blockedTimes);
                self.mouseDown = true;

                // check the event we're making
                var thisday = parseInt($(this).attr("day"));
                var thistime = $(this).parent().attr("id");

                // we want to populate the index if it's undefined
                if (!self.blockedTimes[thisday]) self.blockedTimes[thisday] = [];

                var blockedTimeIndex = self.blockedTimes[thisday].indexOf(thistime);

                // check whether we've already blocked this timeslot
                if (blockedTimeIndex > -1) {
                    self.removeTimes = true;
                    self.blockedTimes[thisday].splice(blockedTimeIndex, 1);
                } else {
                    self.removeTimes = false;
                    self.blockedTimes[thisday].push(thistime);
                }

                // Toggle the visual class
                $(this).toggleClass("blockedTime");
            }).mouseover(function () {
                if (!self.mouseDown) return;

                // get the data for this time block
                var thisDay = parseInt($(this).attr("day"));
                var thisTime = $(this).parent().attr("id");

                if (!self.blockedTimes[thisDay]) self.blockedTimes[thisDay] = [];

                var blockedTimeIndex = self.blockedTimes[thisDay].indexOf(thisTime);

                if (self.removeTimes && blockedTimeIndex > -1) {
                    self.blockedTimes[thisDay].splice(blockedTimeIndex, 1);
                    $(this).toggleClass("blockedTime");
                } else if (!self.removeTimes && blockedTimeIndex === -1) {
                    self.blockedTimes[thisDay].push(thisTime);
                    $(this).toggleClass("blockedTime");
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

                if (!thisDay || thisDay.length === 0) continue;

                // Check if it sets a new day range
                if (day < minDay) minDay = day;
                if (day > maxDay) maxDay = day;

                // Iterate times
                var _iteratorNormalCompletion9 = true;
                var _didIteratorError9 = false;
                var _iteratorError9 = undefined;

                try {
                    for (var _iterator9 = thisDay[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
                        var thisTime = _step9.value;

                        var totalMin = parseInt(thisTime.split("-")[0]) * 60 + parseInt(thisTime.split("-")[1]);

                        // Check if it sets a new time range
                        if (totalMin > maxTime) maxTime = totalMin;
                        if (totalMin < minTime) minTime = totalMin;
                    }
                } catch (err) {
                    _didIteratorError9 = true;
                    _iteratorError9 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion9 && _iterator9.return) {
                            _iterator9.return();
                        }
                    } finally {
                        if (_didIteratorError9) {
                            throw _iteratorError9;
                        }
                    }
                }
            }

            // Make sure there are blocked times
            if (maxDay === -1 || minDay === 7 || minTime === 1440 || maxTime === 0) return;

            // Make sure its at least monday to friday
            if (minDay !== 0) minDay = 0;
            if (maxDay < 4) maxDay = 4;

            // Resize the calendar
            this.resizeCalendar(minDay, maxDay, Math.floor(minTime / 60), Math.floor(maxTime / 60) + 1);
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

            this.resizeCalendar(0, 4, 9, 17);
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

        // we want to save the term and uni in localStorage
        localStorage.setItem('uni', uni);
        localStorage.setItem('term', term);

        this.searchFound = []; // Array that sorts search results by order of importance

        $("#searchcourses").unbind(); // unbind search if there is a bind
        $("#searchcourses").val('');

        this.createTermDropdown();
        this.createLocationDropdown();
        this.getClasses();

        // bind the scroll tooltip destroy event
        this.bindTooltipScrollDestroy();
    }

    /*
        Removes all divs for tooltips in the body container
    */


    _createClass(ClassList, [{
        key: "removeAllBodyTooltips",
        value: function removeAllBodyTooltips() {
            // Remove any open tooltip div
            $('[role=tooltip]').each(function () {
                $(this).remove();
            });
        }

        /*
            Binds event to destroy any tooltips on classlist/mycourses scroll
        */

    }, {
        key: "bindTooltipScrollDestroy",
        value: function bindTooltipScrollDestroy() {
            var _this = this;

            // Extension to catch scroll end event: http://stackoverflow.com/a/3701328
            $.fn.scrollEnd = function (callback, timeout) {
                $(this).scroll(function () {
                    var $this = $(this);
                    if ($this.data('scrollTimeout')) {
                        clearTimeout($this.data('scrollTimeout'));
                    }

                    $this.data('scrollTimeout', setTimeout(callback, timeout));
                });
            };

            // Bind scrollEnd events on the class data and course list
            $("#classdatawraper").scrollEnd(function () {
                return _this.removeAllBodyTooltips();
            }, 150);

            $("#courseList").scrollEnd(function () {
                return _this.removeAllBodyTooltips();
            }, 150);
        }

        /*
            Populates the term selector dropdown beside the search bar
        */

    }, {
        key: "createTermDropdown",
        value: function createTermDropdown() {
            var self = this;

            $("#termselectdropdown").empty();

            // set our current term
            $("#termselect").html(window.unis[this.uni]["terms"][this.term] + ' <img src="assets/arrow.png">');

            // populate the terms
            for (var term in window.unis[this.uni]["terms"]) {
                var thisTerm = window.unis[this.uni]["terms"][term];

                var html = $("<li><a term=\"" + term + "\">" + thisTerm + "</a></li>");

                html.click(function () {
                    // check if they changed terms
                    var newTerm = $(this).find("a").attr("term");

                    if (newTerm == self.term) return;

                    // This is a new term, reinstantiate the object so we can show the new results
                    window.classList = new ClassList(self.uni, newTerm);
                    window.mycourses = new MyCourses(self.uni, newTerm);

                    // reset the calendar
                    window.calendar.resetCalendar();
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
            var _this2 = this;

            var self = this;

            $("#locationselectdropdown").empty();

            // Set the default value
            $("#locationselect").html('All Locations <img src="assets/arrow.png">');

            // Create and bind the all locations option in the dropdown
            var locHTML = $('<li><a location="all">All Locations</a></li>');

            // Bind the click event
            locHTML.click(function () {
                // Only update if there was a change
                if (_this2.location == null) return;

                _this2.location = null;
                $("#locationselect").html('All Locations <img src="assets/arrow.png">');

                // Get the original class data with all info
                _this2.classdata = JSON.parse(_this2.stringClassData);

                // Slide up the classdata div
                $("#classdata").slideUp(function () {
                    // empty it
                    $("#classdata").empty();

                    // populate the classdata with the original class data
                    _this2.populateClassList([_this2.classdata], $("#classdata"), "");
                });
            });

            // Append it to the dropdown
            $("#locationselectdropdown").append(locHTML);

            // Add a divider
            $("#locationselectdropdown").append('<li role="separator" class="divider"></li>');

            // Append every location to the dropdown for this uni
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = window.unis[self.uni]["locations"][Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var thislocation = _step.value;

                    // Create the HTML
                    var html = $("<li><a location=\"" + thislocation + "\">" + thislocation + "</a></li>");

                    // Bind the click event
                    html.click(function () {
                        // check if they changed locations
                        var newLocation = $(this).find("a").attr("location");

                        if (newLocation == self.location) return;

                        self.location = newLocation;
                        $("#locationselect").html(newLocation + ' <img src="assets/arrow.png">');

                        // Update the classlist
                        self.updateLocation(self.location);
                    });

                    // Append this to the dropdown
                    $("#locationselectdropdown").append(html);
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }
        }

        /*
            Updates the classlist to only include the specified locations
        */

    }, {
        key: "updateLocation",
        value: function updateLocation(newLocation) {
            var _this3 = this;

            // Get the original class data with all info
            this.classdata = JSON.parse(this.stringClassData);

            // Prune out children that don't have relevant locations
            this.pruneLocations("", "", this.classdata, newLocation);

            // Slide up the class data
            $("#classdata").slideUp(function () {
                // Empty it
                $("#classdata").empty();

                // If we found results, populate it
                if (Object.keys(_this3.classdata).length > 0) _this3.populateClassList([_this3.classdata], $("#classdata"), "");else $("#classdata").text("There are no courses with that location :(").slideDown();
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

                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = data["classes"][Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var thisClass = _step2.value;

                        if (thisClass.location == location) {
                            foundLocation = true;
                            includesLocations.push(thisClass);
                        }
                    }

                    // overwrite the classes
                } catch (err) {
                    _didIteratorError2 = true;
                    _iteratorError2 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion2 && _iterator2.return) {
                            _iterator2.return();
                        }
                    } finally {
                        if (_didIteratorError2) {
                            throw _iteratorError2;
                        }
                    }
                }

                data["classes"] = includesLocations;

                // tell the parent to delete themselves if other branches aren't fruitfull
                return !foundLocation;
            } else {
                var deleteThis = true;

                // For every key in this data
                for (var key in data) {
                    if (key != "description") {
                        // Get this data
                        var thisData = data[key];

                        // Call this function on the child and see if they have any children with a relevant location
                        if (this.pruneLocations(data, key, thisData, location) == false) {
                            deleteThis = false;
                        } else {
                            // No child has a relevant location, remove this branch
                            delete data[key];
                        }
                    }
                }

                if (deleteThis) delete parent[parentkey]; // remove this parent branch

                return deleteThis;
            }
        }

        /*
            Retrieves the class list and populates the classes accordion
        */

    }, {
        key: "getClasses",
        value: function getClasses() {
            var _this4 = this;

            $("#classdata").fadeOut(function () {
                $("#classdata").empty();

                // Remove any current loading animations for courses
                $("#courseSelector").find("#loading").remove();

                // Add loading animation
                var loading = new Loading($("#CourseDataLoader"), "Loading Course Data...");

                // Get the class data
                $.getJSON(_this4.baseURL + "unis/" + _this4.uni + "/" + _this4.term + "/all", function (data) {
                    _this4.classdata = data["classes"];
                    _this4.rmpdata = data["rmp"];

                    // Make a saved string copy for future purposes if they change locations
                    _this4.stringClassData = JSON.stringify(_this4.classdata);

                    // Find the RMP average
                    _this4.findRMPAverage(_this4.rmpdata);

                    loading.remove(function () {
                        // We want to make sure the user hasn't chosen a new term while this one was loading
                        if (_this4.uni == window.uni && _this4.term == window.term) {
                            // In case the user spammed different terms while loading

                            // let mycourses load any saved states
                            window.mycourses.loadState();

                            // Create the tutorial obj, if they are new, it will launch it
                            var thistut = new Tutorial();

                            // Empty out the div
                            $("#classdata").empty();

                            // Populate the list
                            _this4.populateClassList([data["classes"]], $("#classdata"), "");
                            _this4.bindSearch();
                        }
                    });
                }).error(function (data) {
                    // Show the error
                    loading.remove(function () {
                        $("#classdata").text(data.responseJSON.error).slideDown();
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
            var totalRatings = 0;
            var numRatings = 0;

            for (var key in rmpdata) {
                var teacher = rmpdata[key];
                if (teacher.rating) {
                    totalRatings += teacher["rating"];
                    numRatings += 1;
                }
            }

            if (numRatings == 0) this.rmpavg = 2.5; // no ratings
            else this.rmpavg = totalRatings / numRatings;
        }

        /*
            Generates a class descriptions (details button contents)
        */

    }, {
        key: "generateClassDesc",
        value: function generateClassDesc(desc) {
            var html = '<div class="accordiondesc">';
            var append_amt = 0;

            if (desc["aka"]) {
                html += "AKA: " + desc["aka"] + "<br>";
                append_amt += 1;
            }

            if (desc["desc"]) {
                html += desc["desc"] + "<br><br>";
                append_amt += 1;
            }

            if (desc["units"]) {
                html += desc["units"] + " units; ";
                append_amt += 1;

                if (desc["hours"] === undefined) {
                    html += "<br>";
                }
            }

            if (desc["hours"]) {
                html += desc["hours"] + "<br>";
                append_amt += 1;
            }

            html += '</div>';

            if (append_amt === 0) return "";else return html;
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
            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
                for (var _iterator3 = this.detailKeys[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var detail = _step3.value;

                    if (data[detail] === undefined) continue;

                    // Capitalize the first letter of the key
                    var capitalDetail = detail.charAt(0).toUpperCase() + detail.slice(1);

                    // Proper spacing
                    if (detailIndex > 0) html += "<br><br>";

                    html += capitalDetail + ": " + data[detail];

                    detailIndex += 1;
                }
            } catch (err) {
                _didIteratorError3 = true;
                _iteratorError3 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion3 && _iterator3.return) {
                        _iterator3.return();
                    }
                } finally {
                    if (_didIteratorError3) {
                        throw _iteratorError3;
                    }
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

            if (rmpdata["rating"]) text = "(" + rmpdata["rating"] + ")";

            if (rmpdata["id"] === undefined) return text;else {
                return "<a href='https://www.ratemyprofessors.com/ShowRatings.jsp?tid=" + rmpdata.id + "' target='_blank' \n                    class='rmplink' rmpteacher='" + teacher + "'>" + text + "</a>";
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

            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {
                for (var _iterator4 = allowedAttributes[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                    var attribute = _step4.value;

                    // Make sure its id is defined
                    if (rmpdata[attribute["id"]]) {
                        html += "<b style='font-weight: bold;'>" + attribute.name + "</b>: " + rmpdata[attribute["id"]] + "<br>";
                    }
                }
            } catch (err) {
                _didIteratorError4 = true;
                _iteratorError4 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion4 && _iterator4.return) {
                        _iterator4.return();
                    }
                } finally {
                    if (_didIteratorError4) {
                        throw _iteratorError4;
                    }
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
            var _iteratorNormalCompletion5 = true;
            var _didIteratorError5 = false;
            var _iteratorError5 = undefined;

            try {
                for (var _iterator5 = typeOrder[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                    var type = _step5.value;

                    var nonPushedClasses = [];

                    // Go through each class and if it has the same type, add it
                    var _iteratorNormalCompletion8 = true;
                    var _didIteratorError8 = false;
                    var _iteratorError8 = undefined;

                    try {
                        for (var _iterator8 = data["classes"][Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                            var thisClass = _step8.value;

                            // If this student is at U of A and they aren't an engineer, don't display engineering classes
                            if (self.uni === 'UAlberta' && Number(self.term) % 10 === 0 && engineerFlag === false) {
                                if (thisClass['section'][1].match(/[a-z]/i) !== null) continue;

                                if (thisClass["type"] === type) orderedClasses.push(thisClass);else nonPushedClasses.push(thisClass);
                            } else {
                                if (thisClass["type"] === type) orderedClasses.push(thisClass);else nonPushedClasses.push(thisClass);
                            }
                        }
                    } catch (err) {
                        _didIteratorError8 = true;
                        _iteratorError8 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion8 && _iterator8.return) {
                                _iterator8.return();
                            }
                        } finally {
                            if (_didIteratorError8) {
                                throw _iteratorError8;
                            }
                        }
                    }

                    data["classes"] = nonPushedClasses;
                }

                // Add the rest of the classes that weren't matched
            } catch (err) {
                _didIteratorError5 = true;
                _iteratorError5 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion5 && _iterator5.return) {
                        _iterator5.return();
                    }
                } finally {
                    if (_didIteratorError5) {
                        throw _iteratorError5;
                    }
                }
            }

            var _iteratorNormalCompletion6 = true;
            var _didIteratorError6 = false;
            var _iteratorError6 = undefined;

            try {
                for (var _iterator6 = data["classes"][Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                    var _thisClass = _step6.value;

                    orderedClasses.push(_thisClass);
                }
            } catch (err) {
                _didIteratorError6 = true;
                _iteratorError6 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion6 && _iterator6.return) {
                        _iterator6.return();
                    }
                } finally {
                    if (_didIteratorError6) {
                        throw _iteratorError6;
                    }
                }
            }

            var _iteratorNormalCompletion7 = true;
            var _didIteratorError7 = false;
            var _iteratorError7 = undefined;

            try {
                for (var _iterator7 = orderedClasses[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                    var _thisClass2 = _step7.value;

                    var thisHTML = "<tr>";
                    var id = void 0;

                    if (_thisClass2.section) id = _thisClass2.type + "-" + _thisClass2.section + " (" + _thisClass2.id + ")";else id = _thisClass2.type + "-" + _thisClass2.group + " (" + _thisClass2.id + ")";

                    thisHTML += "<td style='width: 18%;'>" + id + "</td>";

                    var teachersHTML = "";
                    var addedTeachers = [];

                    for (var teacher in _thisClass2["teachers"]) {
                        var thisTeacher = _thisClass2["teachers"][teacher];

                        if (addedTeachers.indexOf(thisTeacher) !== -1) continue;
                        if (teacher > 0) teachersHTML += "<br>";

                        teachersHTML += ClassList.abbreviateName(thisTeacher);

                        console.log(ClassList.abbreviateName(thisTeacher));

                        if (this.rmpdata[thisTeacher]) {
                            teachersHTML += " " + this.generateRMPLink(this.rmpdata[thisTeacher], thisTeacher);
                        }

                        addedTeachers.push(thisTeacher);
                    }

                    var classTimes = _thisClass2["times"].slice();
                    var addedTimes = [];

                    // we want to reduce the size of the times (Th) and remove dupes
                    for (var time in classTimes) {
                        var abbrevTime = ClassList.abbreviateTimes(classTimes[time]);

                        if (addedTimes.indexOf(abbrevTime) === -1) addedTimes.push(abbrevTime);
                    }

                    // Remove duplicates in rooms
                    var addedRooms = [];

                    var _iteratorNormalCompletion9 = true;
                    var _didIteratorError9 = false;
                    var _iteratorError9 = undefined;

                    try {
                        for (var _iterator9 = _thisClass2["rooms"][Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
                            var room = _step9.value;

                            if (addedRooms.indexOf(room) === -1) addedRooms.push(room);
                        }
                    } catch (err) {
                        _didIteratorError9 = true;
                        _iteratorError9 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion9 && _iterator9.return) {
                                _iterator9.return();
                            }
                        } finally {
                            if (_didIteratorError9) {
                                throw _iteratorError9;
                            }
                        }
                    }

                    thisHTML += "<td style='width: 20%;'>" + teachersHTML + "</td>";
                    thisHTML += "<td>" + addedRooms.join("<br>") + "</td>";
                    thisHTML += "<td style='width: 25%;'>" + addedTimes.join("<br>") + "</td>";
                    thisHTML += "<td style='width: 15%;'>" + _thisClass2["location"] + "</td>";
                    thisHTML += "<td>" + _thisClass2["status"] + "</td>";
                    thisHTML += "</tr>";

                    thisHTML = $(thisHTML);

                    if (addButton) {
                        // check whether the user has added this class already
                        if (window.mycourses.hasClass(_thisClass2["id"]) === true) {
                            self.appendClassRemoveBtn(_thisClass2["id"], path, thisHTML);
                        } else {
                            self.appendClassAddBtn(_thisClass2["id"], path, thisHTML);
                        }
                    }

                    html.find("tbody").append(thisHTML);
                }

                // Add tooltips to the rmp ratings
            } catch (err) {
                _didIteratorError7 = true;
                _iteratorError7 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion7 && _iterator7.return) {
                        _iterator7.return();
                    }
                } finally {
                    if (_didIteratorError7) {
                        throw _iteratorError7;
                    }
                }
            }

            html.find('a[rmpteacher]').each(function () {
                var teacher = $(this).attr("rmpteacher");

                // Generate the tooltip text
                var tooltipText = self.generateRMPTooltipHTML(self.rmpdata[teacher]);

                // Add the attributes to the element
                $(this).attr("title", tooltipText);
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
            if (data.description === undefined) return;

            element.append(this.generateClassDesc(data["description"]));

            // Does this class have more info we can put in a details button?
            var foundDetails = false;
            var _iteratorNormalCompletion10 = true;
            var _didIteratorError10 = false;
            var _iteratorError10 = undefined;

            try {
                for (var _iterator10 = this.detailKeys[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
                    var detail = _step10.value;

                    if (data["description"][detail]) {
                        foundDetails = true;
                        break;
                    }
                }
            } catch (err) {
                _didIteratorError10 = true;
                _iteratorError10 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion10 && _iterator10.return) {
                        _iterator10.return();
                    }
                } finally {
                    if (_didIteratorError10) {
                        throw _iteratorError10;
                    }
                }
            }

            if (foundDetails === true) {
                // We have data to make a dropdown for
                this.generateClassDetails(element, path);
            }

            // Populate the class list
            this.generateClasses(data, element, path, true);
        }

        /*
            Does proper DOM manipulation for adding accordion elements
        */

    }, {
        key: "addAccordionDOM",
        value: function addAccordionDOM(data, element, path) {
            var self = this;

            var _iteratorNormalCompletion11 = true;
            var _didIteratorError11 = false;
            var _iteratorError11 = undefined;

            try {
                for (var _iterator11 = data[Symbol.iterator](), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
                    var elem = _step11.value;

                    // this array is sorted by order of importance of populating the elements
                    if (!elem) continue;

                    for (var key in elem) {
                        if (key === "classes") {
                            // This is a class, process it differently
                            this.populateClass(elem, element, path);
                        } else if (key != "description") {
                            // Generate this new element, give it the path
                            var thisPath = "";

                            if (elem[key]["path"]) thisPath = elem[key]["path"];else thisPath = path + "\\" + key;

                            var name = key;

                            if (elem[key]["description"] && elem[key]["description"]["name"]) {
                                name += " - " + elem[key]["description"]["name"];
                            }

                            var thisHTMLElement = $(this.generateAccordionHTML(name, thisPath));

                            if (elem[key]["classes"]) {
                                // check if the user has already selected this course
                                // if so, put a remove button
                                var subject = thisPath.split("\\");
                                var courseNum = subject[subject.length - 1]; // 203
                                subject = subject[subject.length - 2]; // CPSC
                                var courseCode = subject + " " + courseNum; // CPSC 203

                                if (window.mycourses.hasCourse(courseCode)) {
                                    this.appendCourseRemoveBtn(courseCode, thisHTMLElement.find("label"));
                                } else this.appendCourseAddBtn(courseCode, thisHTMLElement.find("label"));
                            }

                            thisHTMLElement.find("label").click(function (event) {
                                event.stopPropagation();
                                self.bindButton(self.classdata, this, "class");
                            });

                            element.append(thisHTMLElement);
                        }
                    }
                }
            } catch (err) {
                _didIteratorError11 = true;
                _iteratorError11 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion11 && _iterator11.return) {
                        _iterator11.return();
                    }
                } finally {
                    if (_didIteratorError11) {
                        throw _iteratorError11;
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
            var addButton = $("<div class=\"addCourseButton\" code=\"" + coursecode + "\">+</div>");

            addButton.click(function (event) {
                event.stopPropagation();

                // get the path for this course
                var path = $(this).parent().attr("path");
                var splitPath = path.split("\\");

                var courseData = self.classdata;

                // get the data for this course
                for (var aPath in splitPath) {
                    if (splitPath[aPath] != "") courseData = courseData[splitPath[aPath]];
                }

                // Add the course to the current active group
                window.mycourses.addCourse(courseData, path);

                // we want to remove this button and replace it with a remove btn
                var courseCode = $(this).attr("code");

                self.appendCourseRemoveBtn(courseCode, $(this).parent());

                // now remove this old button
                $(this).remove();
            });

            element.append(addButton);
        }

        /*
            Appends a remove course button to the element
        */

    }, {
        key: "appendCourseRemoveBtn",
        value: function appendCourseRemoveBtn(coursecode, element) {
            var self = this;
            var removeBtn = $("<div class=\"removeCourseButton\" code=\"" + coursecode + "\">\xD7</div>");

            removeBtn.click(function (event) {
                event.stopPropagation();

                var courseCode = $(this).attr("code");

                // remove the course
                window.mycourses.removeCourse(courseCode);

                // add an "add" button
                self.appendCourseAddBtn(courseCode, $(this).parent());

                // remove this button
                $(this).remove();
            });

            element.append(removeBtn);
        }

        /*
            Appends an add class button to the element (table)
        */

    }, {
        key: "appendClassAddBtn",
        value: function appendClassAddBtn(id, path, element) {
            var self = this;
            var button = $("<td><button class=\"btn btn-default\" classid=\"" + id + "\" path=\"" + path + "\">&plus;</button></td>");

            button.find("button").click(function () {
                // get the path for this course
                var path = $(this).attr('path');
                var splitPath = path.split("\\");

                var courseData = self.classdata;

                // get the data for this course
                for (var aPath in splitPath) {
                    if (splitPath[aPath] != "") courseData = courseData[splitPath[aPath]];
                }

                window.mycourses.addCourse(courseData, $(this).attr('path'), $(this).attr('classid'));

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

            var button = $("<td><button class=\"btn btn-default\" id=\"removeClassBtn\" classid=\"" + id + "\" path=\"" + path + "\">\xD7</button></td>");

            button.find("button").click(function () {
                // get the path for this course
                var path = $(this).attr('path');
                var splitPath = path.split("\\");

                var courseData = self.classdata;

                // get the data for this course
                for (var aPath in splitPath) {
                    if (splitPath[aPath] != "") courseData = courseData[splitPath[aPath]];
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
            var _this5 = this;

            if (noanimations != true) {
                // Slide up the element
                element.slideUp(function () {
                    _this5.addAccordionDOM(data, element, path);
                    element.slideDown();
                });
            } else {
                this.addAccordionDOM(data, element, path);
                element.show();
            }
        }

        /*
            Binds an accordion button
        */

    }, {
        key: "bindButton",
        value: function bindButton(classdata, button, type) {
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
                var thisPath = $(button).attr("path").split("\\");
                $(button).attr("accordopen", "true");

                // Element to populate
                var element = $(button).parent().find("ul");

                // want to find the data to populate
                var thisData = classdata;
                for (var key in thisPath) {
                    if (key > 0) thisData = thisData[thisPath[key]];
                }

                // Populate the element
                if (type === "class") this.populateClassList([thisData], element, $(button).attr("path"));else if (type === "detail") this.populateClassDetails(thisData, element);
            }
        }

        /*
            Binds search
        */

    }, {
        key: "bindSearch",
        value: function bindSearch() {
            var _this6 = this;

            this.typingtimer = null;
            this.typinginterval = 100;

            $("#searchcourses").keyup(function (e) {
                clearTimeout(_this6.typingtimer);

                var searchVal = $("#searchcourses").val();

                _this6.searchFound = [];
                _this6.searchphrase = searchVal.toLowerCase();

                if (searchVal == "" || searchVal == " ") {
                    // Just populate the faculties
                    $("#classdata").empty();
                    _this6.populateClassList([_this6.classdata], $("#classdata"), "", true);
                } else {
                    if (searchVal.length > 2) {
                        _this6.typingtimer = setTimeout(function () {
                            _this6.doneTyping();
                        }, _this6.typinginterval);
                    }
                }
            });
        }

        /*
            Empties and repopulates the accordion with the default view (requires classdata to be fetched)
        */

    }, {
        key: "repopulateAccordion",
        value: function repopulateAccordion() {
            if (this.classdata) {
                $("#classdata").empty();
                this.populateClassList([this.classdata], $("#classdata"), "", true);
            }
        }

        /*
            Performs the search given the phrase when the user is done typing
        */

    }, {
        key: "doneTyping",
        value: function doneTyping() {
            var searchPhraseCopy = this.searchphrase.slice();

            // find and populate the results
            this.findText(this.classdata, searchPhraseCopy, "", "", 0);

            // empty out whatever is there
            $("#classdata").empty();

            // scroll to the top
            $("#classdatawraper").scrollTop(0);

            if (this.searchFound.length && searchPhraseCopy == this.searchphrase) {
                // We found results
                this.populateClassList(this.searchFound, $("#classdata"), "", true);
            } else if (searchPhraseCopy == this.searchphrase) {
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
                var thisClass = data["classes"][key];

                for (var prop in thisClass) {
                    // Check if an array
                    if (thisClass[prop].constructor === Array) {
                        for (var newProp in thisClass[prop]) {
                            if (thisClass[prop][newProp].toString().toLowerCase().indexOf(text) > -1) return true;
                        }
                    } else if (thisClass[prop].toString().toLowerCase().indexOf(text) > -1) return true;
                }
            }

            // Check the description attributes
            for (var _key in data["description"]) {
                var thisDesc = data["description"][_key];

                if (thisDesc.toString().toLowerCase().indexOf(text) > -1) return true;
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

            if (this.searchFound[depth] === undefined) this.searchFound[depth] = {};

            this.searchFound[depth][key] = data;
        }

        /*
            Populates the global searchFound obj with courses that match the specified text (recursive)
        */

    }, {
        key: "findText",
        value: function findText(data, text, path, prevkey, depth, alreadyFound) {
            if (text != this.searchphrase) return;

            if (data["classes"] != undefined) {
                // we are parsing a class
                if (!this.findTextInClasses(data, text)) return;

                var splitPath = path.split("\\");
                var key = splitPath[splitPath.length - 2] + " " + prevkey;

                // We only want to add this course if it hasn't already been added
                if (!alreadyFound) this.addSearchData(data, key, depth, path);
            } else {
                for (var _key2 in data) {
                    if (_key2 == "description") return;

                    var thisFound = false;
                    var thisPath = path + "\\" + _key2;
                    var searchKey = _key2;

                    // Add the subject to a course num if we can (231 = CPSC 231)
                    if (data[_key2]["classes"]) {
                        var _splitPath = thisPath.split("\\");
                        searchKey = _splitPath[_splitPath.length - 2] + " " + searchKey;
                    }

                    // Find the text
                    if (searchKey.toLowerCase().indexOf(text) > -1) {
                        // We found it in the key, add it
                        this.addSearchData(data[_key2], searchKey, depth, thisPath);
                        thisFound = true;
                    } else {
                        var desc = data[_key2]["description"];

                        // check if it has a description, if so, check that
                        if (desc && desc.name && desc.name.toLowerCase().indexOf(text) > -1) {
                            // We found the text in the description, add it to the found list
                            this.addSearchData(data[_key2], searchKey, depth, thisPath);
                            thisFound = true;
                        }
                    }

                    // Recursively look at the children
                    this.findText(data[_key2], text, thisPath, _key2, depth + 1, thisFound);
                }
            }
        }

        /*
            Generates the general accordian structure HTML given a value
        */

    }, {
        key: "generateAccordionHTML",
        value: function generateAccordionHTML(value, path, customclasses) {
            if (customclasses) {
                return "\n                <li class=\"has-children\">\n                    <label path=\"" + path + "\" accordopen=\"false\" class=\"" + customclasses + "\">" + value + "</label>\n                    <ul></ul>\n                </li>\n            ";
            } else {
                return "\n                <li class=\"has-children\">\n                    <label path=\"" + path + "\" accordopen=\"false\">" + value + "</label>\n                    <ul></ul>\n                </li>\n            ";
            }
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
                if (fragment > 0) abbreviated += " ";

                if (fragment == fragments.length - 1) {
                    // keep the full name
                    abbreviated += fragments[fragment];
                } else if (fragment == 0) {
                    var firstName = fragments[fragment];

                    abbreviated += firstName.charAt(0).toUpperCase() + ".";
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

                var uniHTML = '<li class="dropdown-items"><a uni="' + uni + '">' + uniobj["name"];

                if (uniobj["scraping"] == true) {
                    uniHTML += '<span class="label label-default" style="margin-left: 10px;">Updating</span>';
                }

                uniHTML += '</a></li>';

                var html = $(uniHTML);

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
                var labelText = undefined;
                if (this.unis[uni]["scraping"] == true) labelText = "Updating";

                var button = $(this.createButton(unis[uni]["name"], uni, labelText));
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
            Returns the text for an HTML button given text, value and label text
        */

    }, {
        key: "createButton",
        value: function createButton(text, value, labelText) {
            var html = '<button type="button" class="btn btn-default" value="' + value + '">' + text;

            if (labelText != undefined) html += '<span class="label label-default" style="margin-left: 10px;">' + labelText + '</span>';

            html += '</button>';

            return html;
        }
    }]);

    return Welcome;
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
			var self = this;

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

        // Dict where the keys are the class ids and the values their objects
        this.classdict = {};

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
                    init: function init(classes, blockedTimes, term, uni, enggFlag, onlyOpen, classdict, callback) {
                        this.classes = classes;
                        this.onlyOpen = onlyOpen;
                        this.blockedTimes = blockedTimes;
                        this.uni = uni;
                        this.term = term;
                        this.enggFlag = enggFlag;
                        this.classdict = classdict;

                        // To benchmark it
                        this.benchmark = new Date().getTime();

                        // reset possible schedules
                        this.possibleschedules = [];

                        // Set the current conflicts dict
                        this.conflicts = {};

                        // Find the combinations of each group
                        this.findCombinations();

                        // Find all conflicts with each class
                        this.findConflicts(this.classdict);

                        // If there are actually combinations, find the generated schedules
                        if (this.combinations.length > 0) {
                            // Generate the schedules
                            this.generateSchedules([], [], this.conflicts, 0, -1);
                        }

                        console.log("Generated possible schedules in the blob in " + (new Date().getTime() - this.benchmark) + "ms");

                        // Send them back to the calling code
                        callback(this.possibleschedules);
                    },
                    /*
                        For the given classes, finds the domain for each class section such that each section
                        must have exactly one class chosen from it
                          Domains are sorted from lowest to highest length to reduce branching factor early on
                        
                        The contents of each domain are also sorted so that we can use binary search later on
                    */
                    findDomains: function findDomains(classes) {
                        // maps classes to their properties
                        var domains = [];

                        for (var classindex in classes) {
                            var thisclass = classes[classindex];

                            for (var type in thisclass["types"]) {
                                // Set this current domain
                                var thisdomain = [];

                                if (thisclass["types"][type] != true) {
                                    // only this class in the domain

                                    // find the class obj
                                    for (var classindex in thisclass["obj"]["classes"]) {
                                        var otherclass = thisclass["obj"]["classes"][classindex];

                                        // Check if it is the wanted id
                                        if (otherclass["id"] == thisclass["types"][type]) {
                                            // check whether we can add it to the domain
                                            if (this.classAllowed(otherclass)) {
                                                thisdomain.push(otherclass["id"]);
                                                break;
                                            }
                                        }
                                    }
                                } else {
                                    // iterate through each class and if they have this type and are allowed, add them to the domain
                                    for (var classindex in thisclass["obj"]["classes"]) {
                                        var otherclass = thisclass["obj"]["classes"][classindex];

                                        // If it is of the same type, add it to the domain
                                        if (otherclass["type"] == type) {
                                            // If the class doesn't conflict with the general rules, add it to the domain
                                            if (this.classAllowed(otherclass)) {
                                                thisdomain.push(otherclass["id"]);
                                            }
                                        }
                                    }
                                }

                                // If there is nothing in this domain, it is impossible to have a schedule
                                if (thisdomain.length == 0) return false;

                                // Sort this domain for when we use binary search
                                thisdomain.sort();

                                domains.push(thisdomain);
                            }
                        }

                        // Sort so that the smallest domains are first
                        domains.sort(function (a, b) {
                            return a.length - b.length;
                        });

                        return domains;
                    },
                    /*
                        Uses binary search to find the element in the sorted list and returns the index if successful. If not, returns -1
                    */
                    binaryIndexOf: function binaryIndexOf(list, element) {
                        var min = 0;
                        var max = list.length - 1;

                        while (min <= max) {
                            var mid = Math.floor((min + max) / 2);
                            var midval = list[mid];

                            if (element == midval) return mid;else if (element < midval) max = mid - 1;else if (element > midval) min = mid + 1;
                        }

                        return -1;
                    },
                    /*
                        Finds all the conflicts in the given classdict and updates the global conflict dictionary
                    */
                    findConflicts: function findConflicts(classdict) {
                        // For each class
                        for (var classindex in classdict) {
                            var thisclass = classdict[classindex];

                            // If there isn't a key for this class, set it to an empty array
                            if (this.conflicts[thisclass["id"]] == undefined) this.conflicts[thisclass["id"]] = [];

                            // check every other class
                            for (var otherclassindex in classdict) {
                                var otherclass = classdict[otherclassindex];

                                // If the class is different and conflicts, append it to the conflicts of this class
                                if (thisclass["id"] != otherclass["id"] && this.isClassConflict(thisclass, otherclass)) {
                                    this.conflicts[thisclass["id"]].push(otherclass["id"]);
                                }
                            }

                            // Sort ascending order (for binary search later on)
                            this.conflicts[thisclass["id"]].sort();
                        }
                    },
                    /*
                        Returns a boolean as to whether a given class object is allowed
                    */
                    classAllowed: function classAllowed(thisclass) {
                        // Returns Boolean as to whether this class is allowed to be taken

                        // Check if it is open if the user set classes to only open and this isn't a manual class
                        if (this.onlyOpen == true && thisclass["manual"] != true) {
                            if (thisclass["status"] != "Open") {
                                return false;
                            }
                        }

                        // Check if it conflicts with any user times
                        for (var time in thisclass["times"]) {
                            var time = thisclass["times"][time];

                            for (var day in time[0]) {
                                var day = time[0][day];

                                if (this.blockedTimes[day] != undefined) {
                                    for (var blockedTime in this.blockedTimes[day]) {
                                        var thisBlockedTime = this.blockedTimes[day][blockedTime];

                                        // The blocked time has a span of 30min, check if it conflicts
                                        if (this.isConflicting(time[1], [thisBlockedTime, thisBlockedTime + 30])) {
                                            return false;
                                        }
                                    }
                                }
                            }
                        }

                        return true;
                    },
                    /*
                        Returns a boolean as to whether class1 or class2 conflict
                    */
                    isClassConflict: function isClassConflict(class1, class2) {
                        // returns a boolean as to whether two classes conflict

                        // For UAlberta, if the user is in engg, if the last class is an engg restricted class and this is the same course,
                        // make sure they are both engg
                        if (this.enggFlag == true && this.uni == "UAlberta" && Number(this.term) % 10 === 0) {

                            if (class1["name"] == class2["name"]) {
                                // make sure they have the same group number

                                // If the first one is engg, then the second one must be
                                // and vice versa
                                if (class1['section'][1].match(/[a-z]/i) != null && class2['section'][1].match(/[a-z]/i) == null) {
                                    return true;
                                }

                                if (class1['section'][1].match(/[a-z]/i) == null && class2['section'][1].match(/[a-z]/i) != null) {
                                    return true;
                                }
                            }
                        }

                        // Check whether there is a time conflict between the two
                        for (var time in class1["times"]) {
                            var thistime = class1["times"][time];
                            // compare to last
                            for (var othertime in class2["times"]) {
                                var othertime = class2["times"][othertime];

                                // check if any of the days between them are the same
                                for (var day in thistime[0]) {
                                    var day = thistime[0][day];
                                    if (othertime[0].indexOf(day) > -1) {
                                        // same day, check for time conflict
                                        if (this.isConflicting(thistime[1], othertime[1])) {
                                            return true;
                                        }
                                    }
                                }
                            }
                        }

                        // if there are group numbers, make sure all classes are in the same group
                        // Some Unis require your tutorials to match the specific lecture etc...
                        // we only need to look at the most recent and second most recent groups
                        // since classes that belong to the same course are appended consecutively
                        if (class1["name"] == class2["name"]) {
                            // make sure they have the same group number

                            // If it is a string, make it an array
                            if (typeof class1["group"] == "string") {
                                class1["group"] = [class1["group"]];
                            }
                            if (typeof class2["group"] == "string") {
                                class2["group"] = [class2["group"]];
                            }

                            var isPossible = false;

                            // Check if there is any combination that matches up
                            for (var firstgroup in class1["group"]) {
                                for (var secondgroup in class2["group"]) {
                                    if (class1["group"][firstgroup] == class2["group"][secondgroup]) {
                                        isPossible = true;
                                        break;
                                    }
                                }
                            }

                            // Check if there is a possible combo, if not, there is a time conflict
                            if (isPossible == false) return true;
                        }

                        // The classes don't conflict
                        return false;
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
                    /*
                        Recursive function that uses backtracking and forward checking to generate possible schedules given 
                        the global combinations variable is set
                    */
                    generateSchedules: function generateSchedules(schedule, domains, conflicts, depth, group) {
                        if (depth == domains.length) {
                            // We either have found a successful schedule or we need to take into account the next group

                            if (this.combinations.length - 1 == group) {
                                // found a successful schedule
                                this.possibleschedules.push(JSON.parse(JSON.stringify(schedule)));
                            } else {
                                // we need to take into account the next group
                                group++;

                                // Gets the current group
                                var combos = this.combinations[group];

                                // for every combo, continue on
                                for (var combo in combos) {
                                    // Get the combo and copy the current domain
                                    var thiscombo = combos[combo];
                                    var this_domain = JSON.parse(JSON.stringify(domains));

                                    // Figure out the domains of the combo
                                    var extra_domain = this.findDomains(thiscombo);

                                    // If any of the domains are empty, this is impossible
                                    if (extra_domain == false) continue;

                                    // Combine the extra domain to this domain
                                    var this_domain = this_domain.concat(extra_domain);

                                    // Continue generating schedules
                                    this.generateSchedules(schedule, this_domain, conflicts, depth, group);
                                }
                            }
                        } else {
                            // get current domain
                            var cur_domain = domains[depth];

                            for (var domain_index in cur_domain) {
                                // Get the current class and conflicts for it
                                var thisclass = cur_domain[domain_index];
                                var thisclass_conflicts = conflicts[thisclass];

                                // Create a copy of the domain
                                var this_domain = JSON.parse(JSON.stringify(domains));

                                // Boolean defining whether it is possible to add this class to the current schedule
                                var possible = true;

                                // Forward checking
                                // In all subsequent domains, remove the values if they have a conflict
                                for (var x = depth + 1; x < this_domain.length; x++) {
                                    var foward_domain = this_domain[x];

                                    var new_domain = [];

                                    // For every class in this domain, check whether it is conflicting
                                    for (var domain_class in foward_domain) {
                                        var domain_class = foward_domain[domain_class];

                                        if (this.binaryIndexOf(thisclass_conflicts, domain_class) == -1) {
                                            // this class doesn't conflict, add it to the new domain
                                            new_domain.push(domain_class);
                                        }
                                    }

                                    // If the domain is empty, there are no classes to choose and no possible schedule
                                    if (new_domain.length == 0) {
                                        possible = false;
                                        break;
                                    } else {
                                        this_domain[x] = new_domain;
                                    }
                                }

                                // One of the domains is empty, this is not possible
                                if (!possible) continue;

                                // ensure for each current schedule class that it doesn't conflict
                                // The only reason we do this is because of the group system, when a new domain is added
                                // it needs to be cross validated against the current schedule since the new variables
                                // were not in the domain before in order to check inconsistencies
                                for (var cur_class in schedule) {
                                    var cur_class = schedule[cur_class];

                                    // If this class conflicts with any of the current schedule classes, this is not possible
                                    if (this.binaryIndexOf(thisclass_conflicts, cur_class) > -1) {
                                        possible = false;
                                    }
                                }

                                // The newest class conflicts with the current schedule, cotinue
                                if (!possible) continue;

                                // This schedule + class is possible so far
                                // shift the class onto the schedule
                                schedule.push(thisclass);

                                this.generateSchedules(schedule, this_domain, conflicts, depth + 1, group);

                                // pop the class we added
                                schedule.pop();
                            }
                        }
                    },
                    /*
                        Returns a boolean as to whether time1 and time2 conflict
                    */
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
                    /*
                        Returns all k combinations of set 
                    */
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
                self.schedgenerator.init(self.classes, self.blockedTimes, window.term, window.uni, preferences.getEngineeringValue(), self.onlyOpen, self.classdict, function (result) {
                    // If this isn't terminated, continue sorting
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

            // Reset the status of the calendar
            window.calendar.resetCalendarStatus();

            self.doneScoring = false;

            // Get the user's scoring preferences
            this.getPreferences();

            // Instantiate the sorter
            self.schedSort = operative({
                possibleschedules: [],
                init: function init(schedules, morningSlider, nightSlider, consecutiveSlider, rmpSlider, rmpData, rmpAvg, classdict, callback) {
                    // Set local variables in the blob
                    this.morningSlider = morningSlider;
                    this.nightSlider = nightSlider;
                    this.consecutiveSlider = consecutiveSlider;
                    this.rmpSlider = rmpSlider;
                    this.rmpData = rmpData;
                    this.rmpAvg = rmpAvg;
                    this.classdict = classdict;

                    this.benchmark = new Date().getTime();

                    // Add the scores for each schedules
                    for (var schedule in schedules) {
                        var thisschedule = schedules[schedule];

                        // add the score to the first index
                        thisschedule.unshift(this.scoreSchedule(thisschedule));
                    }

                    // Now sort
                    schedules.sort(this.compareSchedules);

                    console.log("Sorted possible schedules in the blob in " + (new Date().getTime() - this.benchmark) + "ms");

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
                        var thisclass = this.classdict[schedule[classv]];

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

                    return thisscore;
                },
                /*
                    Formats a given schedule so that it is an array of days with an array of sorted times of each event
                */
                formatScheduleInOrder: function formatScheduleInOrder(schedule) {
                    // formats a list of events to the appropriate duration

                    // the schedule must not have any conflicting events
                    var formated = [];

                    for (var classv in schedule) {
                        var thisclass = this.classdict[schedule[classv]];

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
                                    // just append the time
                                    formated[day].push(thistime[1]);
                                } else {
                                    // iterate through each time already there
                                    for (var formatedtime in formated[day]) {
                                        // check if the end time of this event is less than the start time of the next event
                                        var thisformatedtime = formated[day][formatedtime];

                                        if (thistime[1][1] < thisformatedtime[0]) {
                                            formated[day].splice(parseInt(formatedtime), 0, thistime[1]);
                                            break;
                                        } else {
                                            if (formated[day][parseInt(formatedtime) + 1] == undefined) {
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
            self.schedSort.init(this.possibleschedules, this.morningSlider, this.nightSlider, this.consecutiveSlider, this.rmpSlider, window.classList.rmpdata, window.classList.rmpavg, this.classdict, function (result) {
                // If this instance isn't terminated continue and populate the calendar
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

                        // Check if this class was manually set, if so, modify the flag
                        if (thiscourse["types"][thisclass["type"]] == thisclass["id"]) {
                            thisclass["manual"] = true;
                        }

                        this.classdict[thisclass["id"]] = thisclass;
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
        key: "convertScheduleToObj",
        value: function convertScheduleToObj(schedule) {
            var newschedule = [];

            for (var thisclass in schedule) {
                var thisclass = schedule[thisclass];

                if (this.classdict[thisclass] != undefined) {
                    newschedule.push(this.classdict[thisclass]);
                } else {
                    newschedule.push(thisclass);
                }
            }

            return newschedule;
        }

        /*
            Processes a list of successful scored schedules and sets up the calendar
        */

    }, {
        key: "processSchedules",
        value: function processSchedules(schedules) {
            // update the total
            window.calendar.setTotalGenerated(schedules.length);

            // update current
            if (schedules.length == 0) window.calendar.setCurrentIndex(-1);else if (schedules.length > 0) window.calendar.setCurrentIndex(0);

            window.calendar.clearEvents();

            if (schedules.length > 0) {
                // populate the first one
                window.calendar.resetCalendarStatus();

                window.calendar.displaySchedule(this.convertScheduleToObj(schedules[0]));
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
                return this.convertScheduleToObj(this.possibleschedules[index]);
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

                newtime.push(dayarray);
                newtime.push([starttime, endtime]);
            } else {
                // We don't know how to process this time
                // This can happen with courses like web based courses with a time of "TBA"
                newtime.push([-1]);
                newtime.push([0, 0]);
            }

            return newtime;
        }
    }]);

    return Generator;
}();
"use strict";

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

            // scroll to the top of the class data wraper
            $("#classdatawraper").scrollTop(0);

            // Hide scrollbars
            // This is for firefox since the pointer events can still move scrollbars 
            // (which can raise events and cause the tour element to disappear)
            $("#classdatawraper").css('overflow', 'hidden');
            $("#courseList").css('overflow', 'hidden');

            // Repopulate the accordion to the default view
            classList.repopulateAccordion();

            setTimeout(function () {
                self.openAccordion();
            }, 500);
        }
    }

    /*
        Open the first top level for every level
    */


    _createClass(Tutorial, [{
        key: "openAccordion",
        value: function openAccordion() {
            this.openedAccordion = true;

            this.openChildRow($('#classdatawraper').children(0));
        }

        /*
            Opens the first row in the child of the specified element
        */

    }, {
        key: "openChildRow",
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
        key: "createIntro",
        value: function createIntro() {
            var self = this;

            window.tour = new Tour({
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

                    // Show the scrollbars again
                    $("#classdatawraper").css('overflow', 'auto');
                    $("#courseList").css('overflow', 'auto');

                    // repopulate the accordion with the default view
                    classList.repopulateAccordion();
                },
                onShown: function onShown(tour) {
                    // If shown, disable pointer events
                    var step = tour._options.steps[tour._current];
                    $(step.element).css('pointerEvents', 'none');
                },
                onHidden: function onHidden(tour) {
                    // On hide, enable pointer events
                    var step = tour._options.steps[tour._current];
                    $(step.element).css('pointerEvents', '');
                }
            });

            // Initialize the tour
            window.tour.init();

            // Start the tour
            window.tour.start().goTo(0);
        }
    }]);

    return Tutorial;
}();
