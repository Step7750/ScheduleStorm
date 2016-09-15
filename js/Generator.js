class Generator {
    constructor(classes) {
        // chosen classes
        this.classes = jQuery.extend(true, {}, classes);


        this.convertTimes();
        this.addCourseInfo();

        this.findCombinations();

        console.log(this.classes);
        console.log(this.combinations);

        
        this.iterateCombos();
        
    }

    /*
        Adds additional course info to each class for easier processing after schedules have been generated
    */
    addCourseInfo() {
        for (var group in this.classes) {
            var thisgroup = this.classes[group];
            var thiscourses = thisgroup["courses"];
            for (var course in thiscourses) {
                var thiscourse  = thiscourses[course];

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
    convertTimes() {
        for (var group in this.classes) {
            var thisgroup = this.classes[group];
            var thiscourses = thisgroup["courses"];
            for (var course in thiscourses) {
                var thiscourse  = thiscourses[course];

                // convert the times of each class
                var classobj = thiscourse["obj"]["classes"];

                for (var classv in classobj) {
                    var thisclass = classobj[classv];

                    // convert time
                    for (var time in thisclass["times"]) {
                        thisclass["times"][time] = Generator.convertTime(thisclass["times"][time]);
                    }
                }
            }
        }
    }
    
    /*
        Converts a time to total minutes since 12:00AM on that day
    */
    static convertToTotalMinutes(time) {
        // Format XX:XXPM or AM 
        var type = time.slice(-2);

        var hours = parseInt(time.split(":")[0]);

        if (type == "PM" && hours < 12) {
            hours += 12;
        }

        var minutes = time.split(":")[1];
        minutes = minutes.substr(0, minutes.length-2);
        minutes = parseInt(minutes);

        return hours * 60 + minutes;
    }

    /*
        Converts the total minutes from 12:00AM on a given day to the timestamp
    */
    static totalMinutesToTime(time) {
        var minutes = time % 60;
        var hours = Math.floor(time/60);

        return hours + ":" + minutes;
    }
    
    static isConflicting(time1, time2) {
        // time1 and time2 are arrays with the first index being the total minutes 
        // since 12:00AM that day of the starttime and the second being the endtime
        // ex. [570, 645] and [590, 740]
        // We check whether the end time of time2 is greater than the start time of time1
        // and whether the end time of time1 is greater than the start time of time2
        // if so, there is a conflict

        if (time1[1] > time2[0] && time2[1] > time1[0]) {
            return true;
        }
        else {
            return false;
        }
    }

    /*
        Converts a time of the form Mo 12:00PM-1:00PM to an array of days and total minutes
    */
    static convertTime(time) {
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
        }
        
        if (time.indexOf(" - ") > -1) {
            var timesplit = time.split(" - ");
            var endtime = Generator.convertToTotalMinutes(timesplit[1]);
            var starttime = Generator.convertToTotalMinutes(timesplit[0].split(" ")[1]);

            // get the days
            var days = timesplit[0].split(" ")[0];

            var dayarray = [];

            for (var day in map) {
                if (days.indexOf(day) > -1) {
                    dayarray.push(map[day]);
                }
            }
        }
        else {
            // We don't know how to process this time
            // This can happen with courses like web based courses with a time of "TBA"
            newtime.push([-1]);
            newtime.push([0, 0]);
        }

        newtime.push(dayarray);
        newtime.push([starttime, endtime]);

        return newtime;
    }


    /*
        Pushes every combination given the type of groups
    */
    findCombinations() {
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
                this.combinations.push(Generator.k_combinations(thesecourses, type));
            }
        }
    }

    /*
        Iterates through every group combinations to find possible non-conflicting schedules
    */
    iterateCombos() {
        // reset possible schedules
        this.possibleschedules = [];

        if (this.combinations.length > 0) {
            // there must be more than 0 combos for a schedule
            for (var combos in this.combinations[0]) {
                // create a copy to work with
                var combocopy = JSON.parse(JSON.stringify(this.combinations[0][combos]));
                this.generateSchedules([], combocopy);

                this.possibleschedulescopy = JSON.parse(JSON.stringify(this.possibleschedules));

                if (this.combinations.length > 1) {
                    console.log("Processing further groups");
                    this.possibleschedules = [];
                    // We have to add the other groups
                    for (var group = 1; group < this.combinations.length; group++) {
                        for (var newcombo in this.combinations[group])  {

                            // for every previous schedule
                            // TODO: If this starts to become slow, we might want to apply some heuristics
                            for (var possibleschedule in this.possibleschedulescopy) {
                                var combocopy = JSON.parse(JSON.stringify(this.combinations[group][newcombo]));
                                this.generateSchedules(this.possibleschedulescopy[possibleschedule], combocopy);
                            }
                        }

                        if (group < (this.combinations.length-1)) {
                            // clear the schedules (we don't want partially working schedules)
                            this.possibleschedulescopy = JSON.parse(JSON.stringify(this.possibleschedules));
                            this.possibleschedules = [];
                        }
                    }
                }
            }
        }

        this.processSchedules(this.possibleschedules);
    }

    /*
        Processes a list of successful schedules and populates the calendar
    */
    processSchedules(schedules) {
        // update the total
        window.calendar.setTotalGenerated(schedules.length);

        // update current
        if (schedules.length == 0) window.calendar.setCurrentIndex(-1);
        else if (schedules.length > 0) window.calendar.setCurrentIndex(0);

        window.calendar.clearEvents();

        if (schedules.length > 0) {
            // populate the first one
            window.calendar.displaySchedule(schedules[0]);
        }
    }

    /*
        Returns the schedule at the specified index
    */
    getSchedule(index) {
        if ((this.possibleschedules.length-1) >= index) {
            return this.possibleschedules[index];
        }
        else {
            return false;
        }
    }

    /*
        Given a wanted class queue and current schedule, this method will recursively find every schedule that doesn't conflict
    */
    generateSchedules(schedule, queue) {
        var timeconflict = false;

        if (queue.length == 0) {
            // we found a successful schedule, push it
            this.possibleschedules.push(schedule);

            // TODO: Add scoring method
        }
        else {
            if (schedule.length > 1) {
                // TODO: REFACTOR NEEDED

                // Check whether the most recent index has a time conflict with any of the others
                for (var x = 0; x < schedule.length-1; x++) {
                    var thistimes = schedule[x]["times"];

                    for (var time in thistimes) {
                        var thistime = thistimes[time];
                        // compare to last
                        for (var othertime in schedule[schedule.length-1]["times"]) {
                            var othertime = schedule[schedule.length-1]["times"][othertime];

                            // check if any of the days between them are the same
                            for (var day in thistime[0]) {
                                var day = thistime[0][day];
                                if ($.inArray(day, othertime[0]) > -1) {
                                    // same day, check for time conflict
                                    if (Generator.isConflicting(thistime[1], othertime[1])) {
                                        timeconflict = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (schedule.length > 1) {
                // if there are group numbers, make sure all classes are in the same group
                // Some Unis require your tutorials to match the specific lecture etc...
                // we only need to look at the most recent and second most recent groups
                // since classes that belong to the same course are appended consecutively
                if (schedule[schedule.length-1]["name"] == schedule[schedule.length-2]["name"]) {
                    // make sure they have the same group number
                    if (schedule[schedule.length-1]["group"] != schedule[schedule.length-2]["group"]) {
                        // we have a conflict
                        timeconflict = true;
                    }
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
                        }
                        else if (queue[0]["types"][type] != false) {
                            // they chose a specific class to fulfill
                            // add the specific class

                            // find the class
                            for (var classv in queue[0]["obj"]["classes"]) {
                                var thisclass = queue[0]["obj"]["classes"][classv];

                                if (thisclass["id"] == queue[0]["types"][type]) {
                                    // we found the class obj, add it to the schedule
                                    schedule.push(thisclass);

                                    // remove the type from the queue
                                    delete queue[0]["types"][type];

                                    // recursively call the generator
                                    this.generateSchedules(JSON.parse(JSON.stringify(schedule)), JSON.parse(JSON.stringify(queue)));

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
                                // Create a copy of the schedule and push this class
                                var thisschedule = JSON.parse(JSON.stringify(schedule));
                                thisschedule.push(thisclass);

                                this.generateSchedules(thisschedule, JSON.parse(JSON.stringify(queue)));
                            }
                        }
                    }
                }
                else {
                    // we've already found all the types for this class, move on to the next
                    // remove this course
                    queue.shift();

                    this.generateSchedules(schedule, queue);
                }
            }
        }
    }

    /*
        Sets the local preference values with the current state of the sliders
    */
    getPreferences() {
        this.morningSlider = preferences.getMorningValue();
        this.nightSlider = preferences.getNightValue();
        this.consecutiveSlider = preferences.getConsecutiveValue();
        this.rmpSlider = preferences.getRMPValue();
    }

    /*
        Returns a numerical score given a schedule that defines how "good" it is given the user's preferences
    */
    scoreSchedule(schedule) {
        // update preference values
        this.getPreferences();

        var thisscore = 0;

        var totalrating = 0;
        var totalteachers = 0;

        for (var classv in schedule) {
            var thisclass = schedule[classv];

            // add a score based upon the teachers
            totalteachers += thisclass["teachers"].length;

            for (var teacher in thisclass["teachers"]) {
                teacher = thisclass["teachers"][teacher];

                if (window.classList.rmpdata[teacher] != undefined && window.classList.rmpdata[teacher]["numratings"] > 2) {
                    totalrating += window.classList.rmpdata[teacher]["rating"];
                }
                else {
                    // just give them an average rating
                    totalrating += window.classList.rmpavg;
                }
            }
        }

        var avgrmp = totalrating/totalteachers;

        // figure out how far apart the classes are

        var classdistance = 0;

        // We want to transform the data into a usuable format for easily seeing how apart each class is
        var formattedschedule = this.formatScheduleInOrder(schedule);


        var classtimescore = 0.0;
        for (var day in formattedschedule) {
            var day = formattedschedule[day];

            for (var x = 0; x < day.length; x++) {
                var time = day[x];

                // check if it starts in the mourning
                if (time[0] <= 720) {
                    classtimescore += this.morningSlider/50;
                }

                // check if it starts in the night
                if (time[0] >= 1020) {
                    classtimescore += this.nightSlider/50;
                }

                // check for consecutive classes
                // make sure there is a class next
                if ((x+1) < day.length && this.consecutiveSlider != 0) {
                    // get the time of the next class
                    var nexttime = day[x+1];

                    // get the difference between the end of class1 and start of class2
                    var timediff = nexttime[0] - time[1];

                    var thisconsecscore = 0;

                    if (this.consecutiveSlider > 0) {
                        var thisconsecscore = 0.2;
                    }
                    else {
                        var thisconsecscore = -0.2;                        
                    }

                    thisconsecscore += (timediff/10) * (0.006 * -(this.consecutiveSlider/10));

                    console.log("consecutive score: " + thisconsecscore);
                }
            }
        }
        console.log(formattedschedule);


        return thisscore;
    }

    formatScheduleInOrder(schedule) {
        // formats a list of events to the appropriate duration

        // the schedule must not have any conflicting events
        var formated = [];

        console.log(schedule);

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
                    }
                    else {
                        // iterate through each time already there
                        for (var formatedtime in formated[day]) {
                            // check if the end time of this event is less than the start time of the next event
                            var thisformatedtime = formated[day][formatedtime];

                            if (thistime[1][1] < thisformatedtime[0]) {
                                //console.log("Adding " + thistime[1] + " to " + day);
                                formated[day].splice(parseInt(formatedtime), 0, thistime[1]);
                                break;
                            }
                            else {
                                if (formated[day][parseInt(formatedtime)+1] == undefined) {
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

        return formated

    }

    static k_combinations(set, k) {
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
            tailcombs = Generator.k_combinations(set.slice(i + 1), k - 1);
            // For each (k-1)-combination we join it with the current
            // and store it to the set of k-combinations.
            for (j = 0; j < tailcombs.length; j++) {
                combs.push(head.concat(tailcombs[j]));
            }
        }
        return combs;
    }
}