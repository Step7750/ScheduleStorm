class Calendar {
    // Handles the UI construction of the calendar
    constructor() {
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
        $(document).mouseup(() => {
            this.mouseDown = false;

            // Change each deep array to strings for comparison
            let blockedTimesString = JSON.stringify(this.blockedTimes);
            let prevBlockedTimesString = JSON.stringify(this.prevBlockedTimes);

            // Check if the blocked times changed, if so, restart generation
            if (blockedTimesString != prevBlockedTimesString) {
                window.mycourses.startGeneration();
            }

            // Reset prev
            this.prevBlockedTimes = this.blockedTimes;
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
        $("#copySchedToClipboard").tooltip();
        $("#shareToFacebook").tooltip();
        $("#uploadToImgur").tooltip();
    }

    /*
        Binds an event handler to redraw the current schedule when the window is resized (since the event sizes will change)

        Waits for 500ms since the latest resize event
    */
    bindResize() {
        let resizeTimer;

        $(window).resize(() => {
            if (resizeTimer) clearTimeout(resizeTimer);

            resizeTimer = setTimeout(() => this.redrawSchedule(), 500);
        });
    }

    /*
        Binds the Schedule Photo Download button and implements the DL functionality
    */
    bindSchedulePhotoDL() {
        $("#dlSchedulePhoto").click(() => {
            // Take the screenshot
            this.takeCalendarHighResScreenshot(1.6, 2, (canvas) => {
                // Download the picture
                let a = document.createElement('a');
                a.href = canvas.replace("image/png", "image/octet-stream");

                // Set the name of the file
                if (window.uni && window.term) a.download = window.uni + "_" + window.term + "_ScheduleStorm.png";
                else a.download = 'ScheduleStorm_Schedule.png';

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
    bindImgurUpload() {
        $("#uploadToImgur").click(() => {
            /*
                Why do we make a separate window/tab now?

                If we simply open up a new window/tab after we already have the photo uploaded
                and the imgur link, we lose the "trusted" event that came from a user click. 
                As a result, the window/tab would be blocked as a popup. If we create the window
                now while we have a trusted event and then change its location when we're ready, 
                we can bypass this.
            */
            let imgurWindow = window.open("http://schedulestorm.com/assets/imgurloading.png",'Uploading to Imgur...',
                "width=900,height=500");

            // Upload the image to imgur and get the link
            this.uploadToImgur(1.6, (link) => {
                if (link) imgurWindow.location.href = link;
                else imgurWindow.location.href = "http://schedulestorm.com/assets/imgurerror.png"; // error
            });
        });
    }

    /*
        Uploads the current schedule to imgur and returns the URL if successful
        If not, returns false
    */
    uploadToImgur(ratio, cb) {
        // Takes a screenshot of the calendar
        this.takeCalendarHighResScreenshot(ratio, 2, (canvas) => {
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
                    description: "Made using ScheduleStorm.com for " + 
                                window.unis[window.uni]["name"] + " - " + 
                                window.unis[window.uni]["terms"][window.term],
                    image: canvas.split(',')[1]
                },
                dataType: 'json'
            })
            .success((data) => cb(data.data.link))
            .error(() => cb(false));
        });
    }

    /*
        Binds the Facebook share button to actually share on click
    */
    bindFacebookSharing() {
        $("#shareToFacebook").click(() => {
            // We have to preserve this "trusted" event and thus have to make the window now
            let facebookWindow = window.open("http://schedulestorm.com/assets/facebookshare.png",
                "Sharing to Facebook...", "width=575,height=592");
            
            this.uploadToImgur(1.91, (link) => {
                // Set the default image if no image
                if (!link) link = "https://camo.githubusercontent.com/ac09e7e7a60799733396a0f4d496d7be8116c542/6874747" +
                    "03a2f2f692e696d6775722e636f6d2f5a425258656d342e706e67";

                facebookWindow.location.href = this.generateFacebookFeedURL(link);
            });
        });
    }

    /*
        Generates the URL to use to share this schedule to Facebook
    */
    generateFacebookFeedURL(picture) {
        let url = "https://www.facebook.com/v2.8/dialog/feed";
        let parameters = {
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
        let index = 0;

        for (let parameter in parameters) {
            if (index > 0) url += "&";
            else url += "?";

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
    generateFacebookDescription(schedule) {
        let returnText = window.unis[window.uni]["name"] + " - " + window.unis[window.uni]["terms"][window.term];

        if (schedule.length === 0) return returnText;

        returnText += " --- Classes: ";

        let coursesDict = {};

        // Iterate through each class and populate the course dict
        for (let thisClass of schedule) {
            if (typeof thisClass !== "object") continue;

            if (coursesDict[thisClass["name"]] === undefined) coursesDict[thisClass["name"]] = [];

            coursesDict[thisClass["name"]].push(thisClass["id"]);
        }

        // Iterate through the dict keys and add the values to the returnText
        let dictLength = Object.keys(coursesDict).length;
        let index = 0;

        for (let key in coursesDict) {
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
    takeCalendarHighResScreenshot(aspectratio, scaleFactor, cb) {
        let srcEl = document.getElementById("maincalendar");
        let wrapdiv = $(srcEl).find('.wrap');
        let beforeHeight = wrapdiv.height();

        // Want to remove any scrollbars
        wrapdiv.removeClass('wrap');

        // If removing the size caused the rows to be smaller, add the class again
        if (beforeHeight > wrapdiv.height()) wrapdiv.addClass('wrap');

        // Save original size of element
        let originalWidth = srcEl.offsetWidth;
        let originalHeight = wrapdiv.height() + $(srcEl).find("table").eq(0).height();

        // see if we can scale the width for it to look right for the aspect ratio
        if ((originalHeight * aspectratio) <= $(window).width()) originalWidth = originalHeight * aspectratio;

        // Force px size (no %, EMs, etc)
        srcEl.style.width = originalWidth + "px";
        srcEl.style.height = originalHeight + "px";

        // Position the element at the top left of the document because of bugs in html2canvas.
        // See html2canvas issues #790, #820, #893, #922
        srcEl.style.position = "fixed";
        srcEl.style.top = "0";
        srcEl.style.left = "0";

        // Create scaled canvas
        let scaledCanvas = document.createElement("canvas");
        scaledCanvas.width = originalWidth * scaleFactor;
        scaledCanvas.height = originalHeight * scaleFactor;
        scaledCanvas.style.width = originalWidth + "px";
        scaledCanvas.style.height = originalHeight + "px";
        let scaledContext = scaledCanvas.getContext("2d");
        scaledContext.scale(scaleFactor, scaleFactor);

        // Force the schedule to be redrawn
        this.redrawSchedule();

        html2canvas(srcEl, {canvas: scaledCanvas})
        .then((canvas) => {
            // Reset the styling of the source element
            srcEl.style.position = "";
            srcEl.style.top = "";
            srcEl.style.left = "";
            srcEl.style.width = "";
            srcEl.style.height = "";

            wrapdiv.addClass('wrap');

            this.redrawSchedule();

            // return the data
            cb(canvas.toDataURL("image/png"));
        });
    };

    /*
        Binds button that allows you to remove all blocked times
    */
    bindRemoveBlockedTimes() {
        $("#removeBlockedTimes").click(() => {
            // Make sure there are actually blocked times before regenning
            if (JSON.stringify(this.blockedTimes) == "[]") return;

            this.blockedTimes = [];
            this.prevBlockedTimes = [];

            // Visually remove all of the blocked times
            this.removeAllBlockedTimeUI();

            window.mycourses.startGeneration();
        })
    }

    /*
        Binds the copy schedule to clipboard button
    */
    bindCopyScheduleToClipboard() {
        new Clipboard('#copySchedToClipboard', {
            text: () => {
                return this.generateScheduleText(this.currentSchedule);
            }
        });
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
        if (this.isLoading) return;

        this.loading = new Loading($("#schedule").find(".wrap:first"), message, "position: absolute; top: 20%; left: 40%;");
        this.isLoading = true;
    }

    /*
        If there is a loading animation, stops it
    */
    doneLoading(cb) {
        if (this.isLoading) {
            this.loading.remove(() => {
                this.isLoading = false;
                cb();
            });
        }
        else {
            this.isLoading = false;
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
        Sets the calendar status to the defined text
    */
    setCalendarStatus(text) {
        $("#schedule").find("#calendarStatus").text(text);
    }

    /*
        Resets the calendar status to an empty string
    */
    resetCalendarStatus() {
        this.setCalendarStatus("");
    }

    /*
        Displays the given schedule
    */
    displaySchedule(schedule) {
        // set the score, make sure its a number
        if (typeof schedule[0] == "number") $("#scheduleScore").text(schedule[0].toFixed(2));

        // Destroy all the tooltips from previous events
        this.destroyEventTooltips();

        // Clear all the current events on the calendar
        this.clearEvents();

        this.currentSchedule = schedule;
        this.setScheduleConstraints(schedule);

        for (let thisClass of schedule) {
            if (!thisClass.times) continue;

            let text = thisClass["name"] + " - " + thisClass["type"] + " - " + thisClass["id"];

            for (let thisTime of thisClass["times"]) {
                // make sure there isn't a -1 in the days
                if (thisTime[0].indexOf(-1) === -1) {
                    this.addEvent(Generator.totalMinutesToTime(thisTime[1][0]),
                        Generator.totalMinutesToTime(thisTime[1][1]), thisTime[0], text, thisClass);
                }
            }
        }

        // reset the colour ids
        this.resetColours();
    }

    /*
        Redraws the current schedule
    */
    redrawSchedule() {
        if (this.currentSchedule.length > 0) this.displaySchedule(this.currentSchedule);
    }

    /*
        Destroys every currently displayed event tooltip
    */
    destroyEventTooltips() {
        // Destroy the tooltips
        $("#schedule").find('.event').each(function (index) {
            $(this).tooltip('destroy');
        });

        // Remove any open tooltip div
        $('[role=tooltip]').each(function (index) {
            $(this).remove();
        })
    }

    /*
        Returns copy-paste schedule text
    */
    generateScheduleText(schedule) {
        let returnText = `Generated by ScheduleStorm.com for ${window.unis[window.uni]["name"]} 
                        ${window.unis[window.uni]["terms"][window.term]} \n\n`;

        if (schedule.length === 0) {
            returnText += "There were no possible schedules generated :(";
            return returnText;
        }

        // Iterate through each class and populate the return Text
        for (let thisClass of schedule) {
            let thisRow = "";

            if (typeof thisClass === "number") continue;

            // Fill up the row with the correct formatting and order of attributes
            if (thisClass.id) thisRow += `${thisClass.id} | `;
            if (thisClass.name) thisRow += `${thisClass.name} | `;

            if (thisClass.section) thisRow += `${thisClass.type} - ${thisClass.section} (${thisClass.id}) | `;
            else if (thisClass.group) thisRow += `${thisClass.type} - ${thisClass.group} (${thisClass.id}) | `;

            thisRow += `${thisClass.teachers} | `;
            thisRow += `${thisClass.rooms} | `;
            thisRow += `${thisClass.oldtimes} | `;
            thisRow += thisClass.status;

            // Add the row if it was actually populated
            if (thisRow) returnText += thisRow + "\n";
        }

        return returnText;
    }

    /*
        Resets the allocation of colours to each class
    */
    resetColours() {
        for (let colour in this.eventcolours) {
            this.eventcolours[colour] = false;
        }
    }

    /*
        Given a classname, returns the div bg colour
    */
    getEventColour(className) {
        // check if we already have a colour for this class
        for (let colour in this.eventcolours) {
            if (this.eventcolours[colour] === className) return colour;
        }

        // add a new colour for this class
        for (let colour in this.eventcolours) {
            if (this.eventcolours[colour] === false) {
                this.eventcolours[colour] = className;
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
        let maxDay = 4; // we always want to show Mon-Fri unless there are Sat or Sun classes
        let minDay = 0;
        let minHour = 24;
        let maxHour = 0;

        for (let thisClass of schedule) {
            if (!thisClass.times) continue;

            for (let thisTime of thisClass.times) {
                // make sure there isn't a -1 in the days
                if (thisTime[0].indexOf(-1) !== -1) continue;

                let thisMaxDay = Math.max.apply(null, thisTime[0]);

                if (thisMaxDay > maxDay) maxDay = thisMaxDay;

                // check whether these times change the constraints
                let startTime = Generator.totalMinutesToTime(thisTime[1][0]);
                let startHour = parseInt(startTime.split(":")[0]);

                if (startHour < minHour) minHour = startHour;

                let endTime = Generator.totalMinutesToTime(thisTime[1][1]);
                let endHour = parseInt(endTime.split(":")[0]) + 1;

                if (endHour > maxHour) maxHour = endHour;
            }
        }

        // If nothing changed, set default
        if (maxDay === 4 && minDay === 0 && minHour === 24 && maxHour === 0) this.resizeCalendar(0, 4, 9, 17);
        else this.resizeCalendar(minDay, maxDay, minHour, maxHour);
    }

    /*
        Sets the current generated index
    */
    setCurrentIndex(index) {
        if (index > (this.totalGenerated-1)) index = 0;
        if (index < 0) index = this.totalGenerated-1;

        this.curIndex = index;

        // show it on the UI
        this.updateIndexUI(this.curIndex+1);
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
        Sets the total amount of generated schedules for the UI and logistically
    */
    setTotalGenerated(total) {
        this.totalGenerated = total;
        this.updateTotalUI(this.totalGenerated);
    }

    /*
        Goes to the previous schedule
    */
    goToPrev() {
        if (this.totalGenerated === 0) return;

        this.setCurrentIndex(this.curIndex-1);

        // get the schedule
        let newSchedule = window.mycourses.generator.getSchedule(this.curIndex);
        if (newSchedule) this.displaySchedule(newSchedule);
    }

    /*
        Goes to the next schedule
    */
    goToNext() {
        if (this.totalGenerated === 0) return;

        this.setCurrentIndex(this.curIndex+1);

        // get the schedule
        let newSchedule = window.mycourses.generator.getSchedule(this.curIndex);
        if (newSchedule) this.displaySchedule(newSchedule);
    }

    /*
        Binds the buttons that let you go through each generated schedule
    */
    bindNextPrev() {
        // unbind any current binds
        $("#prevSchedule").unbind();
        $("#nextSchedule").unbind();

        $("#prevSchedule").click(() => this.goToPrev());
        $("#nextSchedule").click(() => this.goToNext());
    }

    /*
        Binds the arrow keys and Ctrl+C
    */
    keyBinds() {
        // Bind arrow keys
        $(document).on('keydown', (e) => {
            let tag = e.target.tagName.toLowerCase();

            // We don't want to do anything if they have an input focused or a tour
            if (tag === "input" || window.tourInProgress) return;

            if (e.keyCode === 37) this.goToPrev();
            else if (e.keyCode === 39) this.goToNext();
            else if (e.keyCode === 67 && (e.metaKey || e.ctrlKey)) $("#copySchedToClipboard").click();

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
        Generates the HTML for a calendar event tooltip given a class object
    */
    generateTooltip(classobj) {
        // Return html string
        let htmlString = "";

        // Define the attributes and their names to add
        let allowedAttributes = [
            {
                "id": "id",
                "name": "Class ID"
            },
            {
                "id": "teachers",
                "name": "Teachers"
            },
            {
                "id": "oldtimes",
                "name": "Times"
            },
            {
                "id": "rooms",
                "name": "Rooms"
            },
            {
                "id": "location",
                "name": "Location"
            },
            {
                "id": "scheduletype",
                "name": "Type"
            },
            {
                "id": "status",
                "name": "Status"
            }
        ];

        // Iterate through every attribute
        for (let attribute of allowedAttributes) {
            // Make sure its id is defined in the class
            if (!classobj[attribute.id]) continue;

            htmlString += `<b style='font-weight: bold;'>${attribute.name}</b>: `;

            if (typeof classobj[attribute.id] !== "object") {
                // just add the attribute
                htmlString += `${classobj[attribute.id]}<br>`;
                continue;
            }

            // Iterate through the object
            htmlString += "<br>";

            // Prevent dupes
            let alreadyAdded = [];

            for (let index in classobj[attribute.id]) {
                let elem = classobj[attribute.id][index];

                // Check if we've already added this element
                if (alreadyAdded.indexOf(elem) !== -1) continue;

                htmlString += elem;

                if (attribute["id"] === "teachers" && classList.rmpdata[elem] && classList.rmpdata[elem]["rating"]) {
                    // This teacher has an RMP score, add it
                    htmlString += ` (${classList.rmpdata[elem]["rating"]})`;
                }

                htmlString += "<br>";

                // push it to added elements
                alreadyAdded.push(elem);
            }

        }

        return htmlString;
    }

    /*
        Add an event with start and end time (24 hours)

        Days is an array containing the integers that represent the days that this event is on
    */
    addEvent(starttime, endtime, days, text, classobj) {
        let rowHeight = $("#schedule").find("td:first").height() + 1;
        let startHour = parseInt(starttime.split(":")[0]);
        let startMin = parseInt(starttime.split(":")[1]);
        let endHour = parseInt(endtime.split(":")[0]);
        let endMin = parseInt(endtime.split(":")[1]);

        // round down to closest 30min or hour
        let roundedStartMin = Math.floor(startMin/30) * 30;

        // figure out how many minutes are in between the two times
        let totalStartMin = startHour*60 + startMin;
        let totalEndMin = endHour*60 + endMin;

        let totalMin = totalEndMin - totalStartMin;

        // Calculate the height of the box
        let totalHeight = (totalMin/30)*rowHeight;

        // calculate how far from the top the element is
        let topOffset = ((startMin % 30)/30) * rowHeight;

        // draw the events
        for (let day of days) {
            // find the parent
            let tdElement = $("#schedule").find("#" + startHour + "-" + roundedStartMin);
            tdElement = tdElement.find("td:eq(" + (day+1) + ")");

            // empty it
            tdElement.empty();

            let eventColour = this.getEventColour(classobj.name);
            let tooltipText = this.generateTooltip(classobj);

            let html = `<div class="event" style="height: ${totalHeight}px; top: ${topOffset}px; 
                        background: ${eventColour};" data-toggle="tooltip" title="${tooltipText}">
                            ${text}
                        </div>`;

            // Initialize the tooltip
            html = $(html).tooltip({container: 'body', html: true});

            tdElement.append(html);
        }
    }

    /*
        Resizes the calendar to the specified constraints
    */
    resizeCalendar(startDay, endDay, startHour, endHour) {
        let self = this;

        // If the difference between the start and end hours is less than 6, extend the end hour
        // This is to make sure the appearance of the calendar doesn't look weird and
        // that every row is 20px high

        if ((endHour - startHour) < 6) endHour += 6 - (endHour - startHour);
        if (endHour > 24) endHour = 24;

        this.emptyCalendar();

        // all parameters are inclusive

        // build header
        let header = '<table><thead><tr><th class="headcol"></th>';
        
        for (let x = startDay; x <= endDay; x++) {
            header += "<th>" + this.weekdays[x] + "</th>";
        }

        header += '</tr></thead></table>';

        // append the header
        $("#schedule").find(".outer:first").append(header);


        let table = '<div class="wrap"><table class="offset"><tbody>';

        // we start 30 min earlier than the specified start hour
        let min = 30;
        let hour = startHour-1; // 24 hour

        while (hour < endHour) {
            if (min >= 60) {
                min = 0;
                hour += 1;
            }

            // find 12 hour equivalent
            let hours12 = ((hour + 11) % 12 + 1);
            let hourText = "";

            if (min == 0) hourText += hours12 + ":00";

            // generate the text
            table += `
                <tr id="${hour}-${min}">
                    <td class="headcol">${hourText}</td>
            `;

            let iterateLength = endDay - startDay + 1;

            for (let x = 0; x < iterateLength; x++) {
                let blockedTimeClass = "";

                if (this.blockedTimes[x] && this.blockedTimes[x].indexOf(hour + "-" + min) > -1) {
                    blockedTimeClass = "blockedTime";
                }

                table += `<td day="${x}" class="${blockedTimeClass}"></td>`;
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
            let thisday = parseInt($(this).attr("day"));
            let thistime = $(this).parent().attr("id");

            // we want to populate the index if it's undefined
            if (!self.blockedTimes[thisday]) self.blockedTimes[thisday] = [];

            let blockedTimeIndex = self.blockedTimes[thisday].indexOf(thistime);

            // check whether we've already blocked this timeslot
            if (blockedTimeIndex > -1) {
                self.removeTimes = true;
                self.blockedTimes[thisday].splice(blockedTimeIndex, 1);
            }
            else {
                self.removeTimes = false;
                self.blockedTimes[thisday].push(thistime);
            }

            // Toggle the visual class
            $(this).toggleClass("blockedTime");
        }).mouseover(function () {
            if (!self.mouseDown) return;

            // get the data for this time block
            let thisDay = parseInt($(this).attr("day"));
            let thisTime = $(this).parent().attr("id");

            if (!self.blockedTimes[thisDay]) self.blockedTimes[thisDay] = [];

            let blockedTimeIndex = self.blockedTimes[thisDay].indexOf(thisTime);

            if (self.removeTimes && blockedTimeIndex > -1) {
                self.blockedTimes[thisDay].splice(blockedTimeIndex, 1);
                $(this).toggleClass("blockedTime");
            }
            else if (!self.removeTimes && blockedTimeIndex === -1) {
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
    displayBlockedTimes() {
        let maxDay = -1;
        let minDay = 7;

        let minTime = 1440;
        let maxTime = 0;

        // Iterate through the blocked times
        for (let day in this.blockedTimes) {
            let thisDay = this.blockedTimes[day];

            if (!thisDay || thisDay.length === 0) continue;

            // Check if it sets a new day range
            if (day < minDay) minDay = day;
            if (day > maxDay) maxDay = day;

            // Iterate times
            for (let thisTime of thisDay) {
                let totalMin = parseInt(thisTime.split("-")[0])*60 + parseInt(thisTime.split("-")[1]);

                // Check if it sets a new time range
                if (totalMin > maxTime) maxTime = totalMin;
                if (totalMin < minTime) minTime = totalMin;
            }
        }

        // Make sure there are blocked times
        if (maxDay === -1 || minDay === 7 || minTime === 1440 || maxTime === 0) return;

        // Make sure its at least monday to friday
        if (minDay !== 0) minDay = 0;
        if (maxDay < 4) maxDay = 4;

        // Resize the calendar
        this.resizeCalendar(minDay, maxDay, Math.floor(minTime/60), Math.floor(maxTime/60)+1);
    }

    /*
        Resets the calendar (removes timeblocks and current schedules)
    */
    resetCalendar() {
        this.blockedTimes = [];
        this.prevBlockedTimes = [];
        this.currentSchedule = [];

        this.setTotalGenerated(0);
        this.setCurrentIndex(-1);

        this.resizeCalendar(0, 4, 9, 17);
    }
}
