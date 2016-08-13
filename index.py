"""
Copyright (c) 2016 Stepan Fedorko-Bartos, Ceegan Hale

Under MIT License - https://github.com/Step7750/ScheduleStorm/blob/master/LICENSE.md

This file is a resource for Schedule Storm - https://github.com/Step7750/ScheduleStorm
"""

import uni
from rmp import RateMyProfessors
import json
import inspect
from flask import Flask
from flask import jsonify
from flask_compress import Compress
from flask.ext.cache import Cache
import time
import logging
import sys


compress = Compress()
app = Flask(__name__)
compress.init_app(app)
uniThreads = {}

app.config['CACHE_TYPE'] = 'simple'  # Cache to app memory
app.cache = Cache(app)

def loadSettings():
    with open("settings.json") as settingFile:
        return json.load(settingFile)


settings = loadSettings()

@app.route('/v1/unis', methods=['GET'])
@app.cache.cached(timeout=300)
def getUnis():
    responsedict = {}

    for uni in list(uniThreads.keys()):
        responsedict[uni] = {"terms": uniThreads[uni].getTerms(),
                             "name": settings["Universities"][uni]["fullname"],
                             "rmp": settings["Universities"][uni]["fullname"]}

    return jsonify(responsedict)

@app.route('/v1/unis/<string:uni>/<string:term>', methods=['GET'])
@app.cache.cached(timeout=300)
def getUniTermSubjects(uni, term):
    # The term must be a string since the threads represent them as such
    if uni in uniThreads and term in uniThreads[uni].getTerms():
        return jsonify({"subjects": uniThreads[uni].getSubjectList(term)})
    else:
        return jsonify({"error": "The specified university or term was not found"}), 400


@app.route('/v1/unis/<string:uni>/<string:term>/all', methods=['GET'])
@app.cache.cached(timeout=300)
def getAllUniTermSubjects(uni, term):
    # The term must be a string since the threads represent them as such
    if uni in uniThreads and term in uniThreads[uni].getTerms():
        return jsonify(uniThreads[uni].getSubjectListAll(term))
    else:
        return jsonify({"error": "The specified university or term was not found"}), 400


@app.route('/v1/unis/<string:uni>/desc', methods=['GET'])
@app.cache.cached(timeout=300)
def getAllUniTermDesc(uni):
    # The term must be a string since the threads represent them as such
    if uni in uniThreads:
        return jsonify(uniThreads[uni].getCourseDescriptions())
    else:
        return jsonify({"error": "The specified university or term was not found"}), 400


@app.route('/v1/unis/<string:uni>/subjects', methods=['GET'])
@app.cache.cached(timeout=300)
def getAllUniSubDesc(uni):
    # The term must be a string since the threads represent them as such
    if uni in uniThreads:
        return jsonify(uniThreads[uni].getSubjectDesc())
    else:
        return jsonify({"error": "The specified university or term was not found"}), 400


if __name__ == '__main__':

    # Instantiate the unis

    # Get the modules of uni
    unimemebers = inspect.getmembers(uni)
    rmpids = []

    print("Instantiating University Threads")

    # Foreach university in settings
    for university in settings["Universities"]:

        # Get the settings
        unisettings = settings["Universities"][university]


        # Only instantiate if they have it enabled in settings
        if "enabled" in unisettings and unisettings["enabled"]:

            # Check if rmpid is set, if so, add it to the rmpids list
            if "rmpid" in unisettings:
                rmpids.append(unisettings["rmpid"])

            foundClass = False

            # Find the module of this uni
            for member in unimemebers:
                if member[0] == university:

                    # Now find the class in the module
                    uniclasses = inspect.getmembers(member[1])

                    # Iterate the classes
                    for uniclass in uniclasses:
                        if uniclass[0] == university:
                            # Found the class, it must be the same name as the key for this Uni (ex. UCalgary)
                            uniThreads[university] = uniclass[1](unisettings)

                            print("Instantiated " + university + "'s thread")
                            foundClass = True

            if not foundClass:
                print("We couldn't find the class to instantiate for", university)

    print("Starting University Threads")
    # Start each Uni thread
    for uniThread in uniThreads:
        print("Starting " + uniThread + "'s thread")
        uniThreads[uniThread].start()

    # Start up the RateMyProfessors scraper if there is at least one rmp id
    if len(rmpids) > 0 and "rmpinterval" in settings:
        print("Starting RMP scraper")
        rmpthread = RateMyProfessors(rmpids, settings["rmpinterval"])
        rmpthread.start()

    # Run the flask API
    app.run(debug=False)
