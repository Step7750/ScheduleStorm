<p align="center">
  <img src="http://i.imgur.com/ZBRXem4.png"/>
</p>

Input your courses, preferences, and your machine will take care of the rest

Schedule Storm is a schedule generator web app that let's you input your courses and preferences to generate possible schedules.

Rather than just supporting one university, Schedule Storm is a platform in which you can support your any university by extending the modules.

#### Supported Universities:
  * University of Calgary
  * University of Alberta (TODO)
  * Mount Royal University (TODO)

Want us to support your university?
  * If you can, feel free to send pull requests with additional functionality
  * If not, file a new issue and we'll look into it!


## How does it work?

The front-end of the site is hosted on Github pages and proceeds to query a central API server that we host. The API server holds the university data and replies to the client with whatever they need. 

When a client chooses a specific term and uni, we send over all of the class data and ratemyprofessor ratings in a gzipped response (~350KB compressed, ~3MB uncompressed). 

**All requests are cached for 6 hours**

Since the client has all the data they need, class searching and generation can all be done client side now. Due to this, there is no additional latency in sending requests back and forth. 

## Tech Stack

* MongoDB
* Python Backend w/ Falcon for the API Server and threads for each University
* ES6 OOP Frontend (transpiled to ES5 in production to support more clients)
* Heavy use of JQuery to manipulate the DOM
