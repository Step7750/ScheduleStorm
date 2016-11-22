<p align="center">
  <a href="http://schedulestorm.com/">
    <img src="http://i.imgur.com/ZBRXem4.png"/>
  </a>
</p>

[ScheduleStorm.com](http://schedulestorm.com)

[You Can Find the Server Repo Here](https://github.com/Step7750/ScheduleStorm_Server)

Schedule Storm is a schedule generator web app that lets you input your courses and preferences to generate possible schedules.

Rather than just supporting one university, Schedule Storm is a platform in which you can support your university by extending the modules.

## Table of Contents
  * [Supported Universities](https://github.com/Step7750/ScheduleStorm#supported-universities)
  * [Features](https://github.com/Step7750/ScheduleStorm#features)
  * [How does it work?](https://github.com/Step7750/ScheduleStorm#how-does-it-work)
  * [Why is it better?](https://github.com/Step7750/ScheduleStorm#why-is-it-better)
  * [Schedule Generator Implementation](https://github.com/Step7750/ScheduleStorm#schedule-generator-implementation)
  * [Tech Stack](https://github.com/Step7750/ScheduleStorm#tech-stack)
  * [How to Transpile (using Babel)](https://github.com/Step7750/ScheduleStorm#how-to-transpile-using-babel)

## Supported Universities
  * University of Calgary
  * University of Alberta
  * Mount Royal University
  * University of Lethbridge

Want us to support your university?
  * If you can, feel free to send pull requests with additional functionality
  * If not, file a new issue and we'll look into it!

## Features
  * Fast and responsive accordion for searching courses
  * Unified UI with your proposed schedules, class search, and selected courses
  * Add specific classes and allow the generator to fill out the rest
  * Fast client side schedule generation when adding courses
  * Inline RMP Ratings
  * Dynamic Scoring that takes into account your preferences
  * Download a photo of your schedule, share it to Facebook or Imgur, or copy it to clipboard
  * Create groups of classes and let the generator use "One of", "Two Of", etc.. of them
  * Block off timeslots by dragging on the calendar
  * Supports many Unis, with a framework for adding more

## How does it work?

The front-end of the site is hosted on Github pages and proceeds to query a central API server that we host. The API server holds the university data and replies to the client with whatever they need.

When a client chooses a specific term and uni, we send over all of the class data and ratemyprofessor ratings in a gzipped response (~350KB compressed, ~3MB uncompressed). 

**All requests are cached for 6 hours**

Since the client has all the data they need, class searching and generation can all be done client side now. Due to this, there is no additional latency in sending requests back and forth. 

## Why is it better?

From the very beginning, we wanted to have a very unified experience when using Schedule Storm. When you add a new course, you can instantly see how your schedules changed. When you change your schedule scoring preferences, you can instantly see the new sorting in the background.

Class searching, scoring, and generation are all client side with web workers used to minimize UI lag. 

When most people look for classes, they want to know how "good" the teacher is and compare that to how good the time slot is. As a result, Schedule Storm takes ratemyprofessor ratings into account when generating schedules. If you believe RMP does not give a good indication of a professor's quality, you can simply change your preferences for score weighting.

Another feature that we saw lacking in other schedule generators was the ability to choose a specific class and let it figure out the proper tutorials, labs, etc... This lets you choose that specific tutorial with your friends, but let it figure out what are the best lectures and labs for it. 

We decided to expand upon Winston's class group features and allow you to have All of, one of, two of, etc... of a certain number of classes. This allows you to make a new group, add a bunch of options to it, and only want it to select 2 or 3 of them.

For the classlist, we wanted to provide the user with a new means of browsing for possible specific classes rather than using their school's (probably) archaic class searching system. When we find a match, professors have a little number next to their name to indicate their RMP rating. We also have in-line course descriptions, requirements, and notes; you won't have to go anywhere else to check whether you have the prerequisites.


## Schedule Generator Implementation

The schedule generator uses a Backtracking algorithm with Forward Checking and the Minimum Remaining Values (MRV) heuristic. The generator and sorter are both client side and in web workers to minimize UI lag during generation, but there is additional overhead with data transfer to the parent page for highly complex schedules.

For the vast majority of users, schedule generation will only take a couple of milliseconds (without transport overhead). Using a deliberately intensive example, out of a search space of 4435200 schedules, the generator found the 178080 possible schedules in ~3s.

Testing was done on the possiblility of using a SAT solver (such as MiniSat) and Emscripten as the LLVM to JavaScript compiler, but there was too much overhead in the creation of the object and didn't have very good solutions with the class grouping support and reusing previous results effectively.

#### Generator Steps:
 
* All duplicate classes with virtually the same attributes are removed
* Class objects are modified so that time conflicts are easier to compute and some attributes are added (ex. "Manual" for manually specified classes)
* A dictionary is created where the keys are the class ids and the values their objects. This minimizes the total data being thrown and copied around and when we need the attributes of a given class, we can retrieve its attributes in O(1) time complexity.
* All of the relevant course data and user settings are sent to the web worker for further processing
* All of the possible combinations for each course group is found and stored ("All of", "Two of", etc...)
* A dictionary is created that contains, for every class id as the key, an array of class ids that conflict with this class
* The recursive backtracking algo is then called which finds the domains for the current combination. The generator must satisfy at least one element in each domain for there to be a possible schedule. The domains are sorted using the MRV heuristic to reduce early on branching factor and the contents of each domain is sorted in ascending order for binary search later on.
* Given the current proposed class in the current domain for a given schedule, it then removes classes from subsequent domains that conflict with this class (Forward Checking). If there is ever an empty domain, we know that a solution is impossible and backtrack.
* Once the depth level is the same as the domain length, we check if we've gone through every class group for this schedule, if so, we append a copy of the current solution to a global variable. If not, we repeat the previous steps and add to the domain.
* The possible schedules are returned to the parent page and sent for sorting.


## Tech Stack

* MongoDB
* Python Backend w/ Falcon for the API Server and threads for each University
* ES6 JS OOP Frontend (transpiled to ES5 in production to support more clients)
* Heavy use of JQuery to manipulate the DOM
* Bootstrap, HTML2Canvas, Clipboard, Operative

### Backend

Each university has an instantiated thread from it's module (ex. UCalgary.py). The backend handles API requests and necessary scraping in an all-in-one package. Each supported university must have an entry in the settings file and have an enabled flag. RMP gets a dedicated thread that looks at the currently enabled Unis and scrapes the ratings for them in the specified interval. Each university has it's settings passed into it's thread upon creation. Each university is required to handle scraping, db management, and API response handlers for itself.


## How to Transpile (using Babel)

**Ensure you have Node.js and npm installed**

1. Copy the `js/core` directory to a place outside of the Github directory (unless you want to explicitly ignore the node files)
2. Change the directory to the parent of the new copied `core` directory
2. Install Babel CLI with: `npm install --save-dev babel-cli`
3. Install the ES2015 preset with: `npm install --save-dev babel-preset-es2015`
4. Transpile the core folder with: `babel core --out-file production_core.js --presets es2015`
5. Copy the resultant `production_core.js` file to the `js` folder in the Github Schedule Storm directory

**Note: Ensure that any changes you make are on the original ES6 `core` file AND the transpiled `production_core.js`**

## Inspiration from:

* [Hey Winston for University of Alberta](https://github.com/ahoskins/winston)



