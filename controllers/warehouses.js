//DEPENDENCIES
const warehouses    = require('express').Router();
const { response }  = require('express');
const db            = require('../models');
const { Warehouse } = db;
const { Op }        = require('sequelize');

module.exports = warehouses;