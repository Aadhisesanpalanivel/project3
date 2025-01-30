const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide an event title"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters long"],
    },
    description: {
      type: String,
      required: [true, "Please provide an event description"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters long"],
    },
    date: {
      type: Date,
      required: [true, "Please provide an event date"],
    },
    time: {
      type: String,
      required: [true, "Please provide an event time"],
    },
    location: {
      type: String,
      required: [true, "Please provide an event location"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Please provide an event category"],
      enum: ["Conference", "Workshop", "Seminar", "Social", "Other"],
    },
    capacity: {
      type: Number,
      required: [true, "Please provide event capacity"],
      min: [1, "Capacity must be at least 1"],
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "cancelled"],
      default: "upcoming",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    registeredParticipants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        registeredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    image: {
      type: String,
      default: "/default-event-image.jpg",
    },
  },
 
);

// Virtual for available spots
eventSchema.virtual("availableSpots").get(function () {
  return this.capacity - this.registeredParticipants.length;
});

// Virtual for whether event is full
eventSchema.virtual("isFull").get(function () {
  return this.registeredParticipants.length >= this.capacity;
});

// Method to check if a user is registered
eventSchema.methods.isUserRegistered = function (userId) {
  return this.registeredParticipants.some(
    (p) => p.user.toString() === userId.toString()
  );
};

// Pre-save middleware to update status based on date
eventSchema.pre("save", function (next) {
  const now = new Date();
  const eventDate = new Date(this.date);

  if (this.status !== "cancelled") {
    if (eventDate < now) {
      this.status = "completed";
    } else if (eventDate.toDateString() === now.toDateString()) {
      this.status = "ongoing";
    } else {
      this.status = "upcoming";
    }
  }

  next();
});

// Index for search functionality
eventSchema.index({
  title: "text",
  description: "text",
  location: "text",
  tags: "text",
});

const Event = mongoose.model("Event", eventSchema);
module.exports = Event;
