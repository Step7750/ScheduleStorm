class Generator {
    constructor(classes, blockedTimes) {
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
    UAlbertaRemoveEnggClasses() {
        for (var group in this.classes) {
            // for every group
            for (var course in this.classes[group]["courses"]) {
                var thiscourse = this.classes[group]["courses"][course];

                // Stores the current non engg classes
                var nonEnggClasses = [];

                // For every class
                for (var classv in thiscourse["obj"]["classes"]) {
                    var thisclass = thiscourse["obj"]["classes"][classv];

                    if (thisclass['section'][1].match(/[a-z]/i) === null){
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
    removeClassDupes(classes) {
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
                    if ((thiscourse["types"][thisclass["type"]] != thisclass["id"]) && thisclass["type"] != "LEC") {

                        // They didn't explicitly want to remove this class, we can try to remove it if its a dupe
                        var thisrmpavg = Generator.getRMPAvgForClass(thisclass);
                        var timesString = JSON.stringify(thisclass["times"]);
                        
                        // We only look at classes above this index
                        for (var anotherclass = (parseInt(classv)+1); anotherclass < thiscourse["obj"]["classes"].length; anotherclass++) {

                            var otherclass = thiscourse["obj"]["classes"][anotherclass];
                            
                            // Check if it has similiar properties
                            if (otherclass["id"] != thisclass["id"] && 
                                otherclass["group"] == thisclass["group"] &&
                                otherclass["location"] == thisclass["location"] &&
                                otherclass["type"] == thisclass["type"] &&
                                thisrmpavg == Generator.getRMPAvgForClass(otherclass)) {

                                var sectionConflict = false;
                                // If u of a, make sure both classes are non-engg or eng
                                if (window.uni == "UAlberta" && Number(window.term) % 10 === 0 && this.engineerFlag == true) {

                                    // For engg classes, the second element in the section string is always an alpha character
                                    if (otherclass['section'][1].match(/[a-z]/i) != null
                                        && thisclass['section'][1].match(/[a-z]/i) == null) {
                                        sectionConflict = true;
                                    }
                                    

                                    if (otherclass['section'][1].match(/[a-z]/i) == null 
                                        && thisclass['section'][1].match(/[a-z]/i) != null){
                                        sectionConflict = true;
                                    }
                                } 
                                

                                if (sectionConflict == false) {
                                    // check if this has a worse status or the same status
                                    if ((otherclass["status"] == "Open" && thisclass["status"] != "Open") ||
                                        otherclass["status"] == thisclass["status"]) {

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
    static getRMPAvgForClass(thisclass) {

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
        }
        else {
            // Got a match
            return rmptotal/rmpamount;
        }
    }

    /*
        Spawns a web worker that generates possible schedules given classes
    */
    schedGen() {
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
                init: function(classes, blockedTimes, term, uni, enggFlag, onlyOpen, classdict, callback) {
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

                    console.log("Generated possible schedules in the blob in " + (new Date().getTime()-this.benchmark) + "ms");

                    // Send them back to the calling code
                    callback(this.possibleschedules);
                },
                /*
                    For the given classes, finds the domain for each class section such that each section
                    must have exactly one class chosen from it

                    Domains are sorted from lowest to highest length to reduce branching factor early on
                    
                    The contents of each domain are also sorted so that we can use binary search later on
                */
                findDomains:function (classes) {
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
                                
                            }
                            else {
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
                    domains.sort(function(a, b){
                      return a.length - b.length;
                    });

                    return domains;
                },
                /*
                    Uses binary search to find the element in the sorted list and returns the index if successful. If not, returns -1
                */
                binaryIndexOf: function (list, element) {
                    var min = 0;
                    var max = list.length-1;

                    while (min <= max) {
                        var mid = Math.floor((min+max)/2);
                        var midval = list[mid];

                        if (element == midval) return mid;
                        else if (element < midval) max = mid-1;
                        else if (element > midval) min = mid+1;
                    }

                    return -1;
                },
                /*
                    Finds all the conflicts in the given classdict and updates the global conflict dictionary
                */
                findConflicts: function(classdict) {
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
                classAllowed: function (thisclass) {
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
                                    if (this.isConflicting(time[1], [thisBlockedTime, thisBlockedTime+30])) {
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
                isClassConflict: function (class1, class2) {
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
                            

                            if (class1['section'][1].match(/[a-z]/i) == null && class2['section'][1].match(/[a-z]/i) != null){
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
                findCombinations: function () {
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
                generateSchedules: function (schedule, domains, conflicts, depth, group) {
                    if (depth == domains.length) {
                        // We either have found a successful schedule or we need to take into account the next group

                        if ((this.combinations.length-1) == group) {
                            // found a successful schedule
                            this.possibleschedules.push(JSON.parse(JSON.stringify(schedule)));
                        }
                        else {
                            // we need to take into account the next group
                            group++;

                            // Gets the current group
                            var combos = this.combinations[group];

                            // for every combo, continue on
                            for (var combo in combos) {
                                // Get the combo and copy the current domain
                                var thiscombo  = combos[combo];
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
                    }
                    else {
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
                            for (var x = depth+1; x < this_domain.length; x++) {
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
                                }
                                else {
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

                            this.generateSchedules(schedule, this_domain, conflicts, depth+1, group);

                            // pop the class we added
                            schedule.pop()

                        }
                    }
                },
                /*
                    Returns a boolean as to whether time1 and time2 conflict
                */
                isConflicting: function (time1, time2) {
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
                },
                /*
                    Returns all k combinations of set 
                */
                k_combinations: function (set, k) {
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
            self.schedgenerator.init(self.classes,
                                    self.blockedTimes, 
                                    window.term, 
                                    window.uni, 
                                    preferences.getEngineeringValue(),
                                    self.onlyOpen,
                                    self.classdict,
                function(result) {
                    // If this isn't terminated, continue sorting
                    if (self.terminated == false) {
                        self.possibleschedules = result;

                        self.doneGenerating = true;
                        
                        // Now score and sort them
                        self.schedSorter();
                    }
                });
        })
    }

    /*
        Spawns a web worker that sorts and scores the current possibleschedules
    */
    schedSorter() {
        var self = this;

        // Reset the status of the calendar
        window.calendar.resetCalendarStatus();

        self.doneScoring = false;

        // Get the user's scoring preferences
        this.getPreferences();

        // Instantiate the sorter
        self.schedSort = operative({
            possibleschedules: [],
            init: function(schedules, morningSlider, nightSlider, consecutiveSlider, rmpSlider, rmpData, rmpAvg, classdict, callback) {
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

                console.log("Sorted possible schedules in the blob in " + (new Date().getTime()-this.benchmark) + "ms");

                callback(schedules);
            },
            /*
                Compare function for the sorting algorithm
            */
            compareSchedules: function (a, b) {
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
            scoreSchedule: function (schedule) {
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
                        }
                        else {
                            // just give them an average rating
                            totalrating += this.rmpAvg;
                        }
                    }
                }

                var avgrmp = totalrating/totalteachers * 3;

                if (this.rmpSlider > 0) {
                    // make this value worth more to the total score
                    avgrmp *= (1 + this.rmpSlider/20);
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

                            classtimescore += thisconsecscore;
                        }
                    }

                    // we want there to be less time spent at school overall for a given day
                    // the longer the difference, the more penalty there is on the score depending on how much the user values time slots
                    var timediff = maxtime - mintime;
                    if (timediff > 0) {
                        if (this.rmpSlider < 0) {
                            // multiply the value
                            thisscore -= timediff/60 * (1 + -(this.rmpSlider/40));
                        }
                        else {
                            thisscore -= timediff/60 * 1.5;
                        }
                    }

                }

                // The user prioritizes time slots over professors, multiply this value
                if (this.rmpSlider < 0) {
                    // make this value worth more to the total score
                    classtimescore *= 1 + -this.rmpSlider/20;
                }

                thisscore += classtimescore;

                return thisscore;
            },
            /*
                Formats a given schedule so that it is an array of days with an array of sorted times of each event
            */
            formatScheduleInOrder: function (schedule) {
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
                            }
                            else {
                                // iterate through each time already there
                                for (var formatedtime in formated[day]) {
                                    // check if the end time of this event is less than the start time of the next event
                                    var thisformatedtime = formated[day][formatedtime];

                                    if (thistime[1][1] < thisformatedtime[0]) {
                                        formated[day].splice(parseInt(formatedtime), 0, thistime[1]);
                                        break;
                                    }
                                    else {
                                        if (formated[day][parseInt(formatedtime)+1] == undefined) {
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
        self.schedSort.init(this.possibleschedules, this.morningSlider, this.nightSlider, this.consecutiveSlider, this.rmpSlider, window.classList.rmpdata, window.classList.rmpavg, this.classdict,
            function(result) {
                // If this instance isn't terminated continue and populate the calendar
                if (self.terminated == false) {
                    self.doneScoring = true;

                    // Replace the reference with the sorted schedules
                    self.possibleschedules = result;

                    window.calendar.doneLoading(function () {
                        self.processSchedules(result);
                    });
                }
            }
        );
    }

    /*
        Adds additional course info to each class for easier processing after schedules have been generated
    */
    addCourseInfo() {
        for (var group in this.classes) {
            var thisgroup = this.classes[group];
            var thiscourses = thisgroup["courses"];
            for (var course in thiscourses) {
            	// Add this to the course amount
            	this.courseamount += 1;

                var thiscourse  = thiscourses[course];

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
    convertBlockedTimes() {
        for (var day in this.blockedTimes) {
            for (var time in this.blockedTimes[day]) {
                var thistime = this.blockedTimes[day][time];

                var totalMin = parseInt(thistime.split("-")[0])*60 + parseInt(thistime.split("-")[1]);

                this.blockedTimes[day][time] = totalMin;
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

        // Map for other types of days
        var map2 = {
            "M": 0,
            "T": 1,
            "W": 2,
            "R": 3,
            "F": 4,
            "S": 5,
            "U": 6
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
        }
        else {
            // We don't know how to process this time
            // This can happen with courses like web based courses with a time of "TBA"
            newtime.push([-1]);
            newtime.push([0, 0]);
        }

        return newtime;
    }

    convertScheduleToObj(schedule) {
        var newschedule = [];

        for (var thisclass in schedule) {
            var thisclass = schedule[thisclass];

            if (this.classdict[thisclass] != undefined) {
                newschedule.push(this.classdict[thisclass]);
            }
            else {
                newschedule.push(thisclass);
            }
        }

        return newschedule;
    }

    /*
        Processes a list of successful scored schedules and sets up the calendar
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
            window.calendar.resetCalendarStatus();

            window.calendar.displaySchedule(this.convertScheduleToObj(schedules[0]));
        }
        else {
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
    getSchedule(index) {
        if ((this.possibleschedules.length-1) >= index) {
            return this.convertScheduleToObj(this.possibleschedules[index]);
        }
        else {
            return false;
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
        this.onlyOpen = preferences.getOnlyOpenValue();
    }

    /*
        Stops any current generation
    */
    stop() {
        if (this.schedSort != false) this.schedSort.terminate();
        if (this.schedgenerator != false) this.schedgenerator.terminate();

        this.terminated = true;
    }

    /*
        Updates the sorting for the current schedule given new preferences
    */
    updateScores() {
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
            }
            else {
                // now score it again
                this.schedSorter();
            }
        }
    }
}