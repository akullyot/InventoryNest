//DEPENDENCIES
const products     = require('express').Router();
const { response } = require('express');
const db           = require('../models');
const { Op }       = require('sequelize');
const { Product, Inventory, Warehouse, Owner, Transfer } = db;




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
        res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
        res.status(500).json(err);
    };
});
//Post a new entry to the database
products.post('/', async (req, res) => {
    try {
        //TODO back end data validation
        //NOTE: for right now we are just straight up ignoring adding a photo
        //insert into database
        try {
            //remove the filename and photo filename from the body
            let sqlData = req.body;
            let photoName = '';
            let photoData = null;
            // first lets see if they have input a photo. If so, the photo must be added to the aws bucket
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
                    res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
                    res.status(201). res.status(201).json({message:'totaladdsuccess' , id:product_id});
                } catch (error) {
                    //remove the pic filename
                    //const removeProductPictureResult = await Product.
                    //if it fails remove the file name from the db and define in the error response
                    res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
                    res.status(201).json({message:'addsuccessnophoto' , id:product_id});
                }
            }
            res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
            res.status(201).json({message:'totaladdsuccess' , id:product_id});
        } catch (err) {
            console.error(err);
            res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
            res.status(500).json(err);
        }
    } catch (err) {
        //do some err
        console.error(err);
        res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
        res.status(500).json(err);
    }
});
//Creation Route: simply needs to send over the appropriate fields and any field constraints
products.get('/new', async (req, res) => {
    let formInfo = {}
    //look into the database and find the appropriate fields
    //send over a json of the following structure
    // field name : fieldtype, fieldrequirements (so like if ENUM give it the array), isAllowNull
    Object.keys(Product.rawAttributes).forEach( key =>{
        let value = null;
        switch (Product.rawAttributes[key].type.toString())
        {
            case 'DATE':
                value = ['date', []]
                break;
            case 'ENUM':
                value = ['select',  Product.rawAttributes[key].values];
                break;
            case 'FLOAT':
            case 'INTEGER':
                //check if primary key, break out 
                value = !Product.rawAttributes[key].primaryKey ? ['number', []] : null; 
                 //later you could put min max in there, int, break this off into sep ints and floats, etc
                break;
            case 'VARCHAR(255)': //thus far we havent defined any limits to size and dont plan on it, but this can be converted into a regex
                //TODO eventually will have to deal with filename and make value file
                value = ['text', []];
                break;
            case 'TEXT':
                value = ['textarea', []];
                break;
        }
        //Now loop through and add if this input is required or not
        //remember this is allow null not required
        if (value !== null)
        {
            value.push(Product.rawAttributes[key].allowNull === undefined ? true : Product.rawAttributes[key].allowNull);
            formInfo[key] = value;
        }
    });
    res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.status(200).json(formInfo);
});
//Singular Product form: needs to show all product information 
products.get('/:id', async (req,res) => {
    try {
        //provide every warehouse as well that it is located in and the amount
        const foundProduct = await Product.findOne({
            where: {product_id: req.params.id},
            attributes: {exclude: ['createdAt', 'updatedAt']},
            include:[
                {model: Inventory, as: "inventories", attributes: ['current_stock_level'],
                    include: {
                        model: Warehouse, as: "warehouse",attributes: {exclude: ['createdAt', 'updatedAt']}
                }},
            ]
        });
        //seperate what is sent into a form
        //show form only holds the product tables info, so remove all populated data
        const showFormInfo = {list : {}};
        for (let i=0; i< Object.keys(foundProduct.dataValues).length; i++ ){
            //this takes out anything thats an array or object, so we are taking out the populations
            if (typeof foundProduct.dataValues[Object.keys(foundProduct.dataValues)[i]] !== 'object')
            {
                //for the sake of standardizing this card for the frontend for warehouses and customers, define the pic information and the 
                //name information and the description (textarea) if it exists
                switch (Object.keys(foundProduct.dataValues)[i])
                {
                    case 'product_name':
                        showFormInfo.name = foundProduct.dataValues[Object.keys(foundProduct.dataValues)[i]];
                        break;
                    case "product_picture_filename":
                        showFormInfo.picture = foundProduct.dataValues[Object.keys(foundProduct.dataValues)[i]];
                        break;
                    case 'product_description':
                        showFormInfo.description = foundProduct.dataValues[Object.keys(foundProduct.dataValues)[i]];
                        break;
                    case 'product_id':
                        showFormInfo.id = foundProduct.dataValues[Object.keys(foundProduct.dataValues)[i]];
                        break;
                    default:
                        showFormInfo.list[Object.keys(foundProduct.dataValues)[i]] = foundProduct.dataValues[Object.keys(foundProduct.dataValues)[i]];
                };
            }
        }
        //Luckily, a warehouse can only ever have one inventory record per product
        // so define it as warehouse_id : {key:val}...
        // the logic of the front end is it takes in a object of {}
        //first we check if there are any warehouses with this product via the inventories
        const wareHouseTableInfo = [];
        for (let i=0; i< foundProduct.inventories.length; i++)
        {
            wareHouseTableInfo.push(foundProduct.inventories[i].warehouse.dataValues);
            //add in the stock amount
            wareHouseTableInfo[i].current_stock_level =   foundProduct.inventories[i].dataValues.current_stock_level;
        };
        //for both a purchase and transfer form we need every single warehouse
        //why dont we give name (state)
        //realistically we should get the capacity but i dont have time to do this check in the end 
        //also include how much of that item the warehouse currently has 
        const allWarehouses = await Warehouse.findAll({
            attributes: ['warehouse_id', 'warehouse_name', 'warehouse_state'],
        });
        //lets put this together such that we have 1:warehouse_id, 'warehouse_name,'warehouse_state','current_stock_level' = 0 if none
        //NOTE this says when i do typeof its an object but i can do array methods, what is this?
        //lets get from above all warehouses with product in it, lets get their id
        let warehousesWithProductIds = {};
        wareHouseTableInfo.forEach(warehouse => {
            warehousesWithProductIds[warehouse.warehouse_id] = warehouse.current_stock_level
        });
        Object.keys(allWarehouses).forEach((warehouseKey) => {
            //check if the warehouse id is in the withproduct obj we made above, if so throw it the currentstockval
            if (Object.keys(warehousesWithProductIds).includes(  allWarehouses[warehouseKey].warehouse_id.toString())){
                //theres got to be a better way but im looping through and dynamically assinging the formatted one. I tried just directly adding 
                // to the all warehouses but wasnt working
                
                allWarehouses[warehouseKey].dataValues.current_stock_level = warehousesWithProductIds[allWarehouses[warehouseKey].warehouse_id];
            }
            else{
                allWarehouses[warehouseKey].dataValues.current_stock_level = 0;
            }
        });
        //For purchasing you also need to know how much money our main user has 
        const ownerMoneyQuery = await Owner.findOne({
            // we always use the first user
            where: [{owner_id : 1}],
            attributes:[ 'starting_money','total_expenditures', 'total_revenue']
        });
        let ownerMoney = ownerMoneyQuery.starting_money - ownerMoneyQuery.total_expenditures + ownerMoneyQuery.total_revenue;
        //what we need here: we need allwarehouses and ownermoney
        const  purchaseTransferForm = {
            allWarehouses : allWarehouses,
            ownerMoney : ownerMoney,
        };
        const sentData = {
            showFormInfo   : showFormInfo,
            associateTable : wareHouseTableInfo,
            purchaseForm   : purchaseTransferForm
        };

        /////Rhionna we are starting here to make the product performance analytics 
        //things we need: the total quantity of products across all inventories
        //                the total number of sales this product has had 
        //                the return from stock price versus sell price
        //                the location in which it is most successfull
        //                a graph that shows over the post 30 days when it has been purchased
        analyticsObject = {
            quantity:0
        };
        foundProduct.dataValues.inventories.forEach((inventory) => {
            //this is may mapping function
            analyticsObject.quantity =  analyticsObject.quantity + inventory.dataValues.current_stock_level;
        });
        
        res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
        res.status(200).json(sentData);
    } catch (err) {
        console.log(err)
        res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
        res.status(500).json(err)
    }
});
//This handles both transferring and buying new products
products.post('/:id', async (req,res) => {
    try {
        switch (req.body.typeof){
            case 'purchase':
                //TODO backend validation
                //for now lets assume its ok 
                //first lets add the cost to our owner profile
                try{
                    const OwnerProfile = await Owner.findOne({
                        where: {owner_id : 1} 
                    });
                    const productPrice = await Product.findOne({
                        where: {product_id : req.body.product_id},
                        attributes:['product_provider_price']
                    });
                    if (OwnerProfile.starting_money + OwnerProfile.total_revenue
                         - OwnerProfile.total_expenditures - (productPrice.product_provider_price * parseInt(req.body.amount)) < 0){
                            //TODO make this the custom error for you dont have enough money, as there can be other errors this may catch
                            throw err;
                         }
                    await OwnerProfile.increment('total_expenditures',{ by: productPrice.product_provider_price * parseInt(req.body.amount)});
                    //ideally id want this outside at the end but im not sure how to do it
                    await OwnerProfile.save();
                }
                catch (err){
                    console.error(err);
                    res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
                    return  res.status(500).json('You have tried to buy something you cannot afford');
                }
                //then we check if the product already had an inventory associated with it in the warehouse
                const checkIfPresent = await Inventory.count({where: {
                    product_id : req.body.product_id,
                    warehouse_id : req.body.warehouse_id
                }});
                if (checkIfPresent > 0){
                    const inventoryToUpdate = await Inventory.findOne({where: {
                        product_id : req.body.product_id,
                        warehouse_id : req.body.warehouse_id
                    }});
                    await inventoryToUpdate.increment('current_stock_level', { by: req.body.amount});
                    //dont save this until you do the other updates
                    await inventoryToUpdate.save();
                }
                else{
                    //then you create a new entry
                    const newInventory = await Inventory.create({
                        warehouse_id       : req.body.warehouse_id,
                        product_id         : req.body.product_id,
                        current_stock_level: req.body.amount,
                        //this is a variable we arent using rn but ill give it a value anyways
                        minimum_stock_level: 5,

                    });
                }
                res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
                res.status(201).json({message:'Your Purchase Was Successful'});
                break;
            case 'transfer':
              //TODO trycatches are needed here
                //first check if your to has an inventory already for the product
                //and double check that your from has an inventory for the product
                const fromInventory = await Inventory.findOne({
                    where: {warehouse_id : req.body.warehouseFrom,
                        product_id : req.body.productId
                     } 
                });
                if (fromInventory === null){
                    throw err;
                }
                const toInventory = await Inventory.findOne({
                    where: {warehouse_id : req.body.warehouseTo,
                        product_id : req.body.productId
                     } 
                });
                if (toInventory === null){
                    // you need to create a new inventory
                    const newInventory = await Inventory.create({
                        //not using this yet
                        minimum_stock_level : 5,
                        current_stock_level : req.body.amount,
                        product_id          : req.body.productId,
                        warehouse_id        : req.body.warehouseTo
                    });
                }else{
                    // you need to increment your to inventory
                    await toInventory.increment('current_stock_level',{ by: req.body.amount});
                    await fromInventory.decrement('current_stock_level',{ by: req.body.amount});
                    await toInventory.save();
                    await fromInventory.save();
                }
                //create your transfer ticket:
                const transferTicket = await Transfer.create({
                    //not using this yet
                    original_warehouse_id : parseInt(req.body.warehouseFrom),
                    new_warehouse_id      : parseInt(req.body.warehouseTo),
                    product_id            : parseInt(req.body.productId),
                    transfer_date         : new Date().toISOString(),
                    transfer_amount       : parseInt(req.body.amount)
                });
                res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
                res.status(201).json({message:'Your Transfer Was Successful'});
                break;
            default:
                console.error('added a type of post from products/id that has not been handled on the backend');
                throw err;
        }
    } catch (err) {
        console.error(err);
        res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
        return  res.status(500).json('There was an error submitting this form');
    }

});
//This handles updating any individual product
products.put('/:id', async(req,res) => {
    //here you should do backend validation 
    //NOTE: right now we have nothing even trying to handle picture insertions, we are just straight putting it in 
    console.log(req.body);
    const productToUpdate = await Product.findOne({
        where:{
            product_id:req.params.id
        }
    });
    await productToUpdate.update(req.body);
    await productToUpdate.save()
    res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.status(201).json({message:'Your Edit Was Successful', id: req.params.id});
});
//Create the form for editing an entry, this is nearly identical to new but with the values populated
products.get('/:id/edit', async (req,res) => {
    //TODO: change forminput to an object of objects, lacking keynames is confusing, do above for new too
    try {
        //first query the database to get your full product information, this will be the 4th value of every child forminfo object
        const foundProduct = await Product.findOne({
            where: {product_id: req.params.id},
            attributes: {exclude: ['createdAt', 'updatedAt']}
        });
        let formInfo = {}
        //look into the database and find the appropriate fields
        //send over a json of the following structure
        // field name : fieldtype, fieldrequirements (so like if ENUM give it the array), isAllowNull, CURRENT VALUE
        Object.keys(Product.rawAttributes).forEach( key =>{
            let value = null;
            switch (Product.rawAttributes[key].type.toString())
            {
                case 'DATE':
                    value = ['date', []]
                    break;
                case 'ENUM':
                    value = ['select',  Product.rawAttributes[key].values];
                    break;
                case 'FLOAT':
                case 'INTEGER':
                    //check if primary key, break out 
                    value = !Product.rawAttributes[key].primaryKey ? ['number', []] : null; 
                     //later you could put min max in there, int, break this off into sep ints and floats, etc
                    break;
                case 'VARCHAR(255)': //thus far we havent defined any limits to size and dont plan on it, but this can be converted into a regex
                    //TODO eventually will have to deal with filename and make value file
                    value = ['text', []];
                    break;
                case 'TEXT':
                    value = ['textarea', []];
                    break;
            }
            //Now loop through and add if this input is required or not
            //remember this is allow null not required
            if (value !== null)
            {
                value.push(Product.rawAttributes[key].allowNull === undefined ? true : Product.rawAttributes[key].allowNull);
                formInfo[key] = value;
                value.push(foundProduct.dataValues[key]);
            }
            //Now we add in our preexitsting data
        });
        res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
        res.status(200).json(formInfo);
    } catch (err) {
        console.log(err)
        res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
        res.status(500).json(err)
    }
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
        res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
        res.status(200).json({
            message: `successfully deleted ${deletedProduct} product(s), and deleted all associated inventories: ${deletedInventory}`
        });
    } catch (err) {
        res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
        res.status(500).json(err);  
    }
});


module.exports = products;










