# Cohort MVP - Finite Social Media for Accountability Groups

A web application for creating temporary, goal-focused accountability groups that automatically archive when their purpose is fulfilled.

## Features

- **Google Authentication**: Simple sign-in with Google accounts only
- **Cohort Creation**: Create time-bound groups with specific goals
- **Real-time Chat**: Group messaging with live updates
- **Shared Checklist**: Collaborative task management
- **Auto-archiving**: Groups become read-only after their end date
- **Mobile-first Design**: Fully responsive across all devices

## Tech Stack

- **Frontend**: Next.js 14 with React
- **Backend**: Firebase (Firestore + Authentication)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Deployment**: Vercel-ready

## Setup Instructions

### 1. Firebase Configuration

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Authentication and set up Google as a sign-in provider
4. Create a Firestore database in production mode
5. Get your Firebase configuration from Project Settings

### 2. Environment Variables

Create a `.env.local` file in the root directory with your Firebase configuration:

\`\`\`env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
\`\`\`

### 3. Firestore Security Rules

Set up these security rules in your Firestore database:

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Cohorts can be read by members, created by authenticated users
    match /cohorts/{cohortId} {
      allow read: if request.auth != null && 
        (request.auth.uid in resource.data.members || request.auth.uid == resource.data.creatorId);
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        (request.auth.uid in resource.data.members || request.auth.uid == resource.data.creatorId);
      
      // Messages subcollection
      match /messages/{messageId} {
        allow read: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/cohorts/$(cohortId)).data.members;
        allow create: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/cohorts/$(cohortId)).data.members;
      }
      
      // Tasks subcollection
      match /tasks/{taskId} {
        allow read, write: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/cohorts/$(cohortId)).data.members;
      }
    }
  }
}
\`\`\`

### 4. Installation & Development

\`\`\`bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
\`\`\`

## Database Schema

### Users Collection
\`\`\`
users/{userId}
├── displayName: string
├── email: string
├── photoURL: string
└── createdAt: timestamp
\`\`\`

### Cohorts Collection
\`\`\`
cohorts/{cohortId}
├── name: string
├── goal: string
├── endDate: timestamp
├── creatorId: string
├── members: array of user UIDs
├── createdAt: timestamp
├── messages/{messageId}
│   ├── text: string
│   ├── senderId: string
│   ├── senderName: string
│   └── timestamp: timestamp
└── tasks/{taskId}
    ├── text: string
    ├── isCompleted: boolean
    └── creatorId: string
\`\`\`

## Key Features Explained

### Finite Social Media Concept
- Groups are created with specific end dates
- Once the end date passes, the cohort becomes read-only
- Focus is on achieving goals, not endless engagement

### Real-time Updates
- Messages appear instantly across all connected clients
- Checklist changes sync in real-time
- Member count updates automatically

### Mobile-first Design
- Responsive layout works on all screen sizes
- Touch-friendly interface elements
- Optimized for mobile browsers

## Deployment

This project is configured for easy deployment on Vercel:

1. Push your code to a GitHub repository
2. Connect the repository to Vercel
3. Add your environment variables in Vercel's dashboard
4. Deploy automatically

## Contributing

This is an MVP focused on core functionality. Future enhancements could include:
- Push notifications
- File sharing
- Progress tracking
- Group analytics
- Custom themes

## License

MIT License - feel free to use this code for your own projects.
