const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcrypt");
 const multer= require("multer");
const path = require("path");
const flash = require("connect-flash");
Schema = mongoose.Schema


const app = express();

app.set("view engine","ejs");

app.use(
    session({
        cookie: { maxAge: 3600000 },
        secret:"node-js",
        resave:false,
        saveUninitialized:false
    })
)

app.use(flash());

app.use(
    express.urlencoded({
        extended:true
    })
);

app.use(express.static("public"));


mongoose.set('strictQuery',true);
mongoose.connect("mongodb://0.0.0.0:27017/ecom", { useNewUrlParser: true });

const userSchema = mongoose.Schema({
    name:String,
    email:String,
    password:String,
    dob:String

});

const User =new mongoose.model("User",userSchema);


const productSchema = mongoose.Schema({
    name:String,
    description:String,
    image:String,
    price:Number,
    quantity:Number,
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    isDelete:{
        type:Boolean,
        default:false
    }


});

const Product =new mongoose.model("Product",productSchema);


const cartschema=mongoose.Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    productId:{
        type: Schema.Types.ObjectId,
        ref: 'Product'
    }  
})

const Cart =new mongoose.model("Cart",cartschema);




const upload=multer({
    storage:multer.diskStorage({
        destination:function(req,file,cb){
            cb(null,"public/uploads")
        },
        filename:function(req,file,cb){
            console.log(file)
            cb(null,file.fieldname+"-"+Date.now()+path.extname(file.originalname))
        }
    })
})






// home route

app.get("/",async function (req,res){

    let logOut=req.flash("logout")
    if(req.session.email){
        let _user = await User.findOne({email:req.session.email});
        if(_user) return  res.render("productlist");
        return res.render("home",{logOut});
    }
    return res.render("home",{logOut});
})


// login get api

app.get("/login",async function (req,res){
    console.log("--------------++++++++++-------")
    if(req.session.email){
        let _user = await User.findOne({email:req.session.email});
        if(_user) return res.redirect("/productlist");
        // let changePass=req.flash("changePass")
        return res.render("login");
    }
    return res.render("login");
})


// login post api

app.post("/login",async function (req, res) {
    const { email, password } = req.body;

  let _user = await User.findOne({ email })
            if (_user) {
               let newpass=await bcrypt.compare(password,_user.password);
               console.log(newpass,"======================================")
                if (newpass && _user.email===email) {
                    req.session.email =_user.email;
                    req.flash("success","login successful")
                    res.redirect("/productlist")
                } else {
                   return res.send("email or passwordis not valid");
                }
            } else {
                return res.render("home");
          
            }
});


// register get api

app.get("/register",async function(req,res){
    return res.render("signup");
})


// register post api

app.post("/register", async function (req, res) {
    const { name, email, password, conpassword, dob } = req.body;
     let _user=await User.findOne({ email: email })
        if (_user) {
            return res.redirect("/login");
        } else {
            let salt = await bcrypt.genSalt(10);
            let hashPass = await bcrypt.hash(password, salt);

            const newUser = new User({
                name,
                email,
                password:hashPass,
                dob
            });

            if (password === conpassword) {
                 let __user=await newUser.save();
                        
                    req.session.email = __user.email;
                   req.flash("register","register successful")
                   

                    res.redirect("/productlist");
            }
        }
    
});



// logout route

app.get("/logout" ,async function(req,res){
    if(req.session){
        req.session.email=null;
        console.log("logout");
        req.flash("logout","successfully logout")
        return res.redirect("/");
        
    }
})

// 
app.get("/changepassword",async function(req,res){
    return res.render("changepassword")
})

app.post("/changepassword",async function(req,res){
    const{password,conpassword}=req.body
    if(password===conpassword){
        let salt = await bcrypt.genSalt(10);
        let newHashPass = await bcrypt.hash(password, salt);
        let _user=await User.findOneAndUpdate({email:req.session.email},{$set:{
            password: newHashPass}})

            // req.flash("changePass","password change successfully")
            return res.redirect("/login");


    }
})



// addproduct get api

app.get("/addproduct",async function(req,res){

    return res.render("addproduct");
})


// addproduct post api

 app.post("/addproduct",upload.single("image"),async function(req,res){

    
    const {name,description,price,quantity,userId}=req.body;
    console.log("===========================",name,description,price,quantity,userId);
    if(req.session.email){
    let user=await User.findOne({email:req.session.email});
     let image=req.file.filename
     console.log("============image===============",req.file);

    var product= new Product({
        name,
        description,
        price,
        quantity,
        userId:user._id,
        image
    });

    const _product= await product.save();
    console.log(_product,"HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH");
    req.flash("success","product added")
    return res.redirect("/productlist");
}
return res.redirect("/login");
})


// productlist get api

app.get("/productlist",async function(req,res){
    console.log("*********",req.session.email)
    if(req.session.email){
    let user=await User.findOne({email:req.session.email});
    console.log("----------------",req.session.email,user);
    let products=await Product.find({userId:user._id,isDelete:false});

    console.log(products);
let log=req.flash("success")
let addPro=req.flash("success")
let addCart=req.flash("cart")
let reg=req.flash("register")

    return res.render("productlist",{products,log,addPro,addCart,reg});
    }
    return res.redirect("/login");
});




// list get api

app.get("/list",async function(req,res){
    if(req.session.email){
    let user=await User.findOne({email:req.session.email});
  
    let products=await Product.find({userId:user._id,isDelete:false});
    let editPro=req.flash("edit")
    let deletePro=req.flash("delete")
return res.render("list",{products,editPro,deletePro});
    }
    return res.redirect("/login");
});









// edit get api

app.get("/edit",async function (req,res){
    let productId=req.query.id
    console.log("----------productId-",productId)

    let product= await Product.findOne({_id:productId})
    console.log("----------product-",product)
    if(req.session.email) return res.render("edit",{productId,product});
    return res.render("home");   
})



// edit post api

app.post("/editproductSave",upload.single("image"),async function(req,res){
    let productId=req.query.id
    console.log("----------productId-",productId)

    let product= await Product.findOne({_id:productId})
    console.log("----------product-",product)

    const{price,quantity,description}=req.body;
    console.log("........",req.file)
    let image=req.file.filename

   
        product.price=price;
        product.quantity=quantity;
        product.description=description;
        product.image=image;
        let _product=await product.save();
        req.flash("edit","product editted")
        return res.redirect("/list");
})



// delete get api

app.get("/delete",async function(req,res){
    let  productId=req.query.id

    let product= await Product.findOneAndUpdate({_id:productId},{$set:{isDelete:true}})
    req.flash("delete","product deleted")
    return res.redirect("/list");

})






// addcart get api


app.get("/addcart",async function(req,res){
    const{productId}=req.query;
    let user=await User.findOne({email:req.session.email})

    var cart= new Cart({
        userId:user._id,
        productId
    })
    let _cart=await cart.save();
console.log("---------????????????",_cart)
req.flash("cart","product added to cart")
    return res.redirect("/productlist");
})

// cartlist get api

app.get("/cartList",async function(req,res){
    if(req.session.email){
        let user=await User.findOne({email:req.session.email});
      
        let cart=await Cart.find({userId:user._id}).populate({path:"productId",model:Product,select:"name price"})
        let totalPrice=0;
        cart.map((val)=>{
            return  totalPrice += val.productId.price
        })

    let totalitem=await Cart.countDocuments({userId:user._id});
    // return res.render("cart",{cart});
    console.log("........",cart)
    let remove=req.flash("remove")
    return res.render("cart",{cart, totalitem, totalPrice,remove})
        }
        return res.redirect("/login") 
})

// remove get api

app.get("/remove",async function(req,res){
    let id=req.query.id
 
    let cart=await Cart.findOne({_id:id})
    cart.remove()
    req.flash("remove","product remove from cart")
    return res.redirect("/cartList")
 })
 




app.listen(5001,function(params){
    console.log("server")
});


