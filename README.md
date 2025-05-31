# Overview

Cast Sure is a comprehensive voting and poll management system that enables users to create, manage, and participate in both paid and free voting events. The system supports two distinct poll types: Creator-Pay and Voter-Pay, with features for USSD voting, real-time results, and secure payment integration.

## Target Audience

- Event organizers and poll creators
- Contest managers
- Voters and participants
- Competition organizers
- Award show managers

## Project Goals

1. Provide a seamless and secure voting platform
2. Enable flexible payment models for different voting scenarios
3. Support multiple voting channels (Web, USSD)
4. Ensure real-time result tracking and transparency
5. Facilitate easy poll management and contestant registration

## Functional Requirements

### FR001: User Authentication and Management

- User registration with email, username, phone number, and password
- Secure login system
- Password reset functionality
- User profile management

### FR002: Poll Creation and Setup

- Two poll types: Creator-Pay and Voter-Pay
- Poll details: title, description, start/end time, image
- Customizable voting fees for Voter-Pay polls
- Expected voter count for Creator-Pay polls (20-200 range)
- Setup fee calculation based on expected voters
- Poll activation after payment confirmation

### FR003: Contestant Management

- Add multiple contestants with details:
  - Name
  - Category
  - Image
  - Unique nominee code generation
- Edit contestant information
- Group contestants by categories
- Search and filter contestants

### FR004: Voting Mechanisms

- Web-based voting interface
- USSD voting support
- Multiple votes capability for Voter-Pay polls
- Voter code validation for Creator-Pay polls
- Real-time vote processing

### FR005: Payment Integration

- Secure payment processing through Paystack
- Support for:
  - Poll activation payments
  - Per-vote payments
  - Setup fee payments
- Payment verification and status tracking
- Transaction history

### FR006: Results and Analytics

- Real-time vote counting
- Category-wise result display
- Vote statistics and analytics
- Result visualization
- Export capabilities

### FR007: Poll Management

- Active/Inactive poll status
- Poll editing and updates
- Contestant addition/removal
- Vote monitoring
- Poll deletion with proper validation

## Technical Specifications

### Architecture

- Frontend: React.js with Tailwind CSS
- Backend: Django REST Framework
- Database: PostgreSQL
- Payment Gateway: Paystack
- File Storage: Cloudinary

### API Endpoints

#### Authentication

- POST /auth/register/
- POST /auth/login/
- POST /auth/token/refresh/

#### Polls

- POST /polls/create/
- GET /polls/list/
- GET /polls/{id}/
- PUT /polls/{id}/update/
- DELETE /polls/{id}/

#### Contestants

- POST /polls/{id}/contestants/create/
- GET /polls/{id}/contestants/
- PUT /polls/{id}/contestants/{id}/update/
- DELETE /polls/{id}/contestants/{id}/

#### Voting

- POST /vote/creator-pay/{poll_id}/
- POST /vote/voter-pay/{poll_id}/
- POST /vote/ussd/{poll_id}/
- GET /poll/{poll_id}/results/

#### Payments

- POST /payment/verify/
- GET /payment/link/
- GET /payment/history/

### Database Schema

#### User

- id (UUID)
- username (String)
- email (String)
- password (Hashed String)
- phone_number (String)
- created_at (DateTime)

#### Poll

- id (UUID)
- creator (Foreign Key: User)
- title (String)
- description (Text)
- poll_image (CloudinaryField)
- start_time (DateTime)
- end_time (DateTime)
- poll_type (String: 'creator-pay'|'voters-pay')
- expected_voters (Integer, nullable)
- voting_fee (Decimal, nullable)
- setup_fee (Integer, nullable)
- active (Boolean)

#### Contestant

- id (UUID)
- poll (Foreign Key: Poll)
- name (String)
- category (String)
- nominee_code (String, unique)
- image (CloudinaryField)

#### Vote

- id (UUID)
- poll (Foreign Key: Poll)
- contestant (Foreign Key: Contestant)
- number_of_votes (Integer)
- created_at (DateTime)

#### Transaction

- id (UUID)
- poll (Foreign Key: Poll)
- user (Foreign Key: User, nullable)
- amount (Decimal)
- transaction_type (String: 'poll_activation'|'vote')
- payment_reference (String)
- success (Boolean)
- created_at (DateTime)

#### VoterCode

- id (UUID)
- poll (Foreign Key: Poll)
- code (String, unique)
- used (Boolean)

## User Stories

### Poll Creator

1. As a creator, I want to create a new poll with custom settings
2. As a creator, I want to add and manage contestants
3. As a creator, I want to monitor voting progress
4. As a creator, I want to generate voter codes for creator-pay polls
5. As a creator, I want to view and export results

### Voter

1. As a voter, I want to view active polls and contestants
2. As a voter, I want to vote through web interface
3. As a voter, I want to vote through USSD
4. As a voter, I want to make secure payments for votes
5. As a voter, I want to view real-time results

## Security Requirements

1. Secure user authentication
2. Encrypted payment processing
3. Protected API endpoints
4. Secure storage of sensitive data
5. Rate limiting for API calls
6. Input validation and sanitization
7. CSRF protection
8. XSS prevention

## Performance Requirements

1. Page load time < 3 seconds
2. API response time < 500ms
3. Support for concurrent voting
4. Real-time result updates
5. Scalable for high traffic
6. Mobile-responsive design

## Future Enhancements

1. SMS verification for voters
2. Additional payment gateways
3. Advanced analytics dashboard
4. Customizable poll templates
5. Multi-language support
6. Blockchain integration for vote verification
7. Social media integration
8. API for third-party integrations
