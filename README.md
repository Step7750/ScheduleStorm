<p align="center">
  <img src="http://i.imgur.com/ZBRXem4.png"/>
</p>

[ScheduleStorm.com](schedulestorm.com)

Schedule Storm is a schedule generator web app that let's you input your courses and preferences to generate possible schedules.

Rather than just supporting one university, Schedule Storm is a platform in which you can support your any university by extending the modules.

#### Supported Universities:
  * University of Calgary
  * University of Alberta (TODO)
  * Mount Royal University (TODO)

Want us to support your university?
  * If you can, feel free to send pull requests with additional functionality
  * If not, file a new issue and we'll look into it!

## Features
  * Very fast and responsive accordion for searching courses
  * Unified UI with your proposed schedules, class search, and selected courses
  * Add specific classes and allow the generator to fill out the rest
  * Instant schedule generation when adding courses
  * Easy to read calendar
  * Inline RMP Ratings
  * Dynamic Scoring that takes into account your preferences 
  * Supports many Unis, with a framework for adding more

## How does it work?

The front-end of the site is hosted on Github pages and proceeds to query a central API server that we host. The API server holds the university data and replies to the client with whatever they need. 

When a client chooses a specific term and uni, we send over all of the class data and ratemyprofessor ratings in a gzipped response (~350KB compressed, ~3MB uncompressed). 

**All requests are cached for 6 hours**

Since the client has all the data they need, class searching and generation can all be done client side now. Due to this, there is no additional latency in sending requests back and forth. 

## Why is it better?

From the very beginning, we wanted to have a very unified experience when using Schedule Storm. When you add a new course, you can instantly see how your schedules changed. When you change your schedule scoring preferences, you can instantly see the new sorting in the background.

We greatly prioritized speed as part of this experience:
  * Class Searching is completely client side
  * Class Generation is completely client side
  * Class Scoring is completely client side
  * In order to minimize UI lag when generating complex schedules, generation and scoring are in web workers

When most people look for classes, they want to know how "good" the teacher is and compare that to how good the time slot is. As a result, Schedule Storm takes ratemyprofessor ratings into account when generating schedules. If you believe RMP does not give a good indication of a professor's quality, you can simply change your preferences for score weighting.

Another feature that we saw lacking in other schedule generators was the ability to choose a specific class and let it figure out the proper tutorials, labs, etc... This lets you choose that specific tutorial with your friends, but let it figure out what are the best lectures and labs for it. 

We decided to expand upon Winston's class group features and allow you to have All of, one of, two of, etc... of a certain number of classes. This allows you to make a new group, add a bunch of options to it, and only want it to select 2 or 3 of them.

For the classlist, we wanted to provide the user with a new means of browsing for possible specific classes rather than using their school's (probably) archaic class searching system. When we find a match, professors have a little number next to their name to indicate their RMP rating. We also have in-line course descriptions, requirements, and notes; you won't have to go anywhere else to check whether you have the prerequisites.

## Tech Stack

* MongoDB
* Python Backend w/ Falcon for the API Server and threads for each University
* ES6 JS OOP Frontend (transpiled to ES5 in production to support more clients)
* Heavy use of JQuery to manipulate the DOM
