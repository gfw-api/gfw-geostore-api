## 31/05/2021

- Update `rw-api-microservice-node` to add CORS support.

## 19/03/2021

- Add MongoDB index to speed up queries by geostore info.

## 25/01/2021

- Increase kubernetes memory limit to support uploading large geometries [https://www.pivotaltracker.com/story/show/176387234](https://www.pivotaltracker.com/story/show/176387234)

## 14/12/2020

- Replace CT integration library

# 1.1.6

## 17/12/2020

- Change syntax for national list queries for better performance with DocumentDB

# 1.1.5

## 17/11/2020

- Security update of NPM package `dot-prop` from 4.2.0 to 4.2.1.

# v1.1.4

## 25/09/2020

- Fix issue when creating area geostore.
- Add error message when trying to view very large geometries.

# v1.1.3

## 02/09/2020

- Minor security fixes.
- Attempt at fixing random errors when creating a geostore.

# v1.1.2

## 18/05/2020

- Upgrade `koa` to v2.x

# v1.1.1

## 15/05/2020

- Upgrade `mongoose` to v5.x

# v1.1.0

## 09/04/2020

- Add node affinity to kubernetes configuration.

# v1.0.0

## 19/03/2020

- Add endpoint for finding geostores by ids.
- Fix issue in loading ISO codes from Carto on v2 admin list endpoint

## Previous

- Update node to v12.x
- Replace `npm` with `yarn`
- Update development dependencies
- Update code style using common API Eslint rules
- Update kubernetes configuration to have resource declaration
- Improve admin queries to database
- Add POST find-by-ids endpoint
