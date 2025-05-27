# Employee Feedback System

A comprehensive feedback system for employees to provide feedback to other departments.

## Features

- **User Authentication**: Secure login and signup with Firebase Authentication
- **Department-specific Feedback**: Employees can provide feedback for departments other than their own
- **Rating System**: 1-5 rating scale with mandatory comments for low ratings
- **Admin Panel**: View feedback statistics, manage feedback questions, and set time periods
- **Responsive Design**: Works well on mobile, tablet, and desktop devices

## Setup Instructions

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your Firebase configuration values
3. Install dependencies:
   ```
   npm install
   ```
4. Start the development server:
   ```
   npm run dev
   ```

## Admin Setup

To set up an admin user:

1. Create a regular user through the signup process
2. In Firebase Console, go to Firestore Database
3. Locate the user document in the "users" collection
4. Edit the document and set `isAdmin` field to `true`
5. The user will now have access to the admin panel at `/admin`

## Firebase Configuration

This project uses Firebase for:
- Authentication (email/password)
- Firestore Database for storing:
  - User profiles
  - Feedback questions
  - Submitted feedback
  - Feedback periods

## Database Structure

- **users**: User profiles with department information
- **feedbackPeriods**: Time periods for feedback collection with department-specific questions
- **feedbacks**: Submitted feedback with ratings and comments

## Technologies Used

- React with TypeScript
- Tailwind CSS for styling
- Firebase Authentication and Firestore
- React Router for navigation
- React Hook Form for form handling
- Date-fns for date formatting