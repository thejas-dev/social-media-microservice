const mongoose = require('mongoose');
const argon2 = require('argon2');

const userSchema = new mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        trim: true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        trim: true,
        lowercase: true,
    },
    password:{
        type:String,
        required:true,
        minlength: 8,
    },
    phonenumber:{
        type:Number,
        required:true,
    },
    country:{
        type:String,
    }
   
},{
    timestamps:true
})

userSchema.pre('save', async function(next){
    if(this.isModified('password')){
        try{
            this.password = await argon2.hash(this.password);
        }catch(err){
            next(err);
        }
    }
})

userSchema.methods.comparePassword = async function(calidatePassword){
    try{
        return await argon2.verify(this.password, calidatePassword);
    }catch(err){
        throw err;
    }
}

userSchema.index({username: 'text'});

const User = mongoose.model('User',userSchema);

module.exports = User;