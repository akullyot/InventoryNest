//DEPENDENCIES
const products     = require('express').Router();
const { response } = require('express');
const db           = require('../models');
const { Op }       = require('sequelize');
const { Product, Inventory, Warehouse } = db;


//STATIC ROUTES
//Home route: simply needs to send over all table data to populate a table
products.get('/', async (req,res) => {
    // Show a table of all products, therefore need to send over all the data
        //each table row will be a link, that will feed in the id 
    // needed associations: none afaik 
    //there will be querying functionality and sorting functionality, likely just do sort via bootstrap 
    try {
        //search through the queries and find those which match a column name from the 
        const columnNames = Object.keys(Product.rawAttributes);
        let whereObject = {};
        for (let i=0; i< Object.keys(req.query).length; i++)
        {
            if (columnNames.includes(Object.keys(req.query)[i]))
            {
                whereObject[Object.keys(req.query)[i]] = req.query(Object.keys(req.query)[i]);
            };
        };
        //you will eventually have to rewrite out the where here dynamically
        const foundProducts = await Product.findAll({
            where: whereObject,
            attributes: {exclude: ['createdAt', 'updatedAt', 'product_picture_filename']}
        });
        res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
        res.status(200).json(foundProducts);
    } catch (err) {
        res.status(500).json(err);
    };
});
//Post a new entry to the database
products.post('/', async (req, res) => {
    try {
        console.log(req.body);
        //TODO back end data validation
        //NOTE: for right now we are just straight up ignoring adding a photo
        //insert into database
        try {
            //remove the filename and photo filename from the body
            let sqlData = req.body;
            let photoName = '';
            let photoData = null;
            if (Object.keys(req.body).includes('product_picture_filename'))
            {
                photoName = req.body.product_picture_filename;
                //eventually add in whatever you named the photo data to a var and delete from the req.body
                //delete req.body.product_picture_file;
                sqlData = req.body; 
            }
            const newProduct = await Product.create(sqlData);
            let product_id =  newProduct.product_id;
            //insert photo into AWS bucket iff the db insertion is successful and theres a photo filename
            if (photoName !== '')
            {
                try {
                    //TODO insert into AWS bucket if present
                    res.status(200).redirect(`/products/${product_id}?message=totaladdsuccess`);
                } catch (error) {
                    //remove the pic filename
                    //const removeProductPictureResult = await Product.
                    //if it fails remove the file name from the db and define in the error response
                    res.status(200).redirect(`/products/${product_id}?message=addsuccessnophoto`);
                }
            }
            res.status(200).redirect(`/products/${product_id}?message=totaladdsuccess`);
        } catch (err) {
            console.log(err);
            res.status(500).json(err);
        }
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
    //adding an entry 
    //here you should do backend validation

});
//Creation Route: simply needs to send over the appropriate fields and any field constraints
products.get('/new', async (req, res) => {
    //look into the database and find the appropriate fields
    
});



//Singular Product form: needs to show all product information 
products.get('/:id', async (req,res) => {
    try {
        
        //check if we are coming from a successfull edit or delete
        let toast = ""
        for (let i=0; i<Object.keys(req.query).length; i++)
        {
            if (Object.keys(req.query)[i] === 'message')
            {
                //this will populate the toast on the front end 
                switch (req.query[Object.keys(req.query)[i]])
                {
                    case 'totaladdsuccess':
                         toast = 'Your product was successfully added to the database';
                        break;
                    case 'addsuccessnophoto':
                         toast = 'Your product was successfully added to the database, but photo uploading failed. You may try again via the edit menu';
                        break;
                    case 'totaleditsuccess':
                        toast = 'Your product was successfully edited.';
                        break;
                    case 'editsuccessnophoto':
                        toast = 'Your product was successfully edited, however, the photo could not be uploaded';
                        break;
                    default:
                        console.log('Look out! you have sent a message to product show page that has no toast equivalent!')
                }
            }
        };

        //provide every warehouse as well that it is located in and the amount
        const foundProduct = await Product.findOne({
            where: {product_id: req.params.id},
            include:[
                {model: Inventory, as: "inventories", include: {
                    model: Warehouse, as: "warehouse",
                }},
            ]
        });
        //these should be their own individual trycatches, even if they fail some data should be sent over
        //Todo: lets also go through the delivery detail and decide if its a hot or cold item
        //Todo: lets go and get the picture and send over a 64bit version
        //Note: i can do this with an AWS bucket and can easily add/edit them too, kim im not sure how you want to do this 
        res.status(200).json(foundProduct)
    } catch (err) {
        res.status(500).json(err)
    }
});
products.put('/:id', async(req,res) => {
    //update the entry 
    //here you should do backend validation 
});
products.delete('/:id', async(req,res) => {
    try {
        //TODO: it may be better in the future to not delete it, but maybe move it to a history database so, if you please, you can still do analytics on it
        // in fact this will actually just straight up be needed
        const deletedProduct = await Product.destroy({
            where: {product_id: req.params.id}
        });
        //TODO you will have to query through inventory and delete those as well
        const deletedInventory = await Inventory.destroy({
            where: {product_id: req.params.id}
        })
        res.status(200).json({
            message: `successfully deleted ${deletedProduct} product(s), and deleted all associated inventories: ${deletedInventory}`
        });
    } catch (err) {
        res.status(500).json(err);  
    }
});


module.exports = products;










