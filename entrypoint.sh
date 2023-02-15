#!/bin/bash
set -e

case "$1" in
    develop)
        echo "Running Development Server"
        exec grunt --gruntfile app/Gruntfile.js | bunyan
        ;;
    startDev)
        echo "Running Start Dev"
        exec node app/index
        ;;
    test)
        echo "Running Test"
        exec yarn test
        ;;
    start)
        echo "Running Start"
        exec yarn start
        ;;
    *)
        exec "$@"
esac
