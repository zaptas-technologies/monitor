import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Flat list of task titles (kept for backwards compatibility / quick access)
    taskTitles: { type: [String], default: [] },
    // Detailed config for task titles with optional start & end dates
    taskTitleConfigs: {
      type: [
        {
          title: { type: String, required: true, trim: true },
          startDate: { type: Date, default: null },
          endDate: { type: Date, default: null },
        },
      ],
      default: [],
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Project', projectSchema);
