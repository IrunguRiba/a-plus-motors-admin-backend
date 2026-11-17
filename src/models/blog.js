const mongoose = require("mongoose");

const blogCommentSchema = new mongoose.Schema(
  {
    id: { 
        type: Number,
        required: true 
    },
    author: {
         type: String, 
         required: true,
          trim: true 
        },
    time: { 
        type: String,
         required: true 
        },
    text: { 
        type: String, 
        required: true,
         trim: true 
        },
    verified: {
        type: Boolean,
         default: false 
        },
  },
  { _id: false }
);

const blogBlockSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["p", "quote", "img"],
      required: true,
    },
    text: { type: String },
    url: { type: String },
    caption: { type: String },
    credit: { type: String },
    wide: { type: Boolean, default: false },
  },
  { _id: false }
);

const blogPostSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    kind: {
      type: String,
      enum: ["blog", "fact"],
      required: true,
      index: true,
    },
    title: {
         type: String, 
         required: true,
          trim: true 
        },
    author: { 
        type: String, 
        required: true, 
        trim: true 
    },
    handle: { type: String,
         required: true, 
         trim: true 
        },
    category: { 
        type: String,
         required: true,
          index: true 
        },
    date: { 
        type: String,
         required: true
         },
    readTime: { 
        type: String, 
        required: true 
    },
    tags: { 
        type: [String], 
        default: [],
         index: true 
        },
    excerpt: { 
        type: String,
         required: true 
        },
    imageUrl: { 
        type: String, 
        required: true 
    },
    imageCaption: {
         type: String, 
         default: ""
         },
    imageCredit: {
         type: String, 
         default: "" 
        },
    body: { 
        type: [blogBlockSchema],
         default: [] 
        },
    likes: {
         type: Number,
          default: 0,
           min: 0 
        },
    liked: { 
        type: Boolean, 
        default: false 
    },
    bookmarked: { 
        type: Boolean, 
        default: false, 
        index: true 
    },
    comments: {
         type: [blogCommentSchema], 
         default: [] 
        },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const sideInformationSchema = new mongoose.Schema(
  {
    id: { 
        type: String,
         required: true,
          unique: true, 
          index: true 
        },
    type: {
      type: String,
      enum: ["car", "video", "finance", "service"],
      required: true,
      index: true,
    },
    tag: {
         type: String, 
         required: true
         },
    kicker: {
         type: String, 
         required: true
         },
    title: { 
        type: String,
         required: true 
        },
    text: { 
        type: String,
         required: true
         },
    ticker: { 
        type: String, 
        default: "" 
    },
    cta: { 
        type: String,
         default: "" 
        },
    imageUrl: { 
        type: String,
         required: true 
        },
    videoUrl: {
         type: String 
        },
    specs: { 
        type: [String], 
        default: []
     },
    price: { 
        type: String 
    },
    priceLabel: { 
        type: String
     },
    carPrice: { 
        type: Number 
    },
    rate: { 
        type: Number 
    },
    months: { 
        type: Number 
    },
  },
  { timestamps: true }
);

const BlogPost = mongoose.model("BlogPost", blogPostSchema);
const SideInformation = mongoose.model(
  "SideInformation",
  sideInformationSchema
);

module.exports = {
  BlogPost,
  SideInformation,
  blogPostSchema,
  sideInformationSchema,
  blogCommentSchema,
  blogBlockSchema,
};
