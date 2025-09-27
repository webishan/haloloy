# Requirements Document

## Introduction

The Customer Facility Reward System is a comprehensive loyalty program that incentivizes customer engagement through three distinct reward mechanisms: StepUp Rewards for milestone achievements, Infinity Rewards for continuous high-value customers, and Affiliate Rewards for customer referrals. This system aims to increase customer retention, encourage higher spending, and drive organic growth through referrals.

## Requirements

### Requirement 1: StepUp Reward System

**User Story:** As a customer, I want to earn milestone rewards based on my total accumulated points, so that I can receive bonus points and see my global achievement ranking.

#### Acceptance Criteria

1. WHEN a customer's total reward points reach 1,500 THEN the system SHALL assign a unique global sequential number (1, 2, 3, ...) to the customer
2. WHEN a global sequential number is assigned THEN the system SHALL display this number in the customer dashboard
3. WHEN the 5th customer globally reaches 1,500 points (global reward number == 5) THEN the system SHALL award 500 bonus points to first 1500 points hitted customer, that's how it works for other global numbers achieved customers, see the logic and use the formula properly
4. WHEN the 25th customer globally reaches 1,500 points (global reward number == 25) THEN the system SHALL award 1,500 bonus points to that customer
5. WHEN the 125th customer globally reaches 1,500 points (global reward number == 125) THEN the system SHALL award 3,000 bonus points to that customer
6. WHEN the 500th customer globally reaches 1,500 points (global reward number == 500) THEN the system SHALL award 30,000 bonus points to that customer
7. WHEN the 2,500th customer globally reaches 1,500 points (global reward number == 2,500) THEN the system SHALL award 160,000 bonus points to that customer
8. WHEN a milestone reward is triggered THEN the system SHALL apply only one reward per milestone achievement to the specific customer who hits that milestone
9. WHEN multiple customers reach 1,500 points THEN the system SHALL ensure global numbers are assigned sequentially without gaps or duplicates
10. WHEN calculating milestone rewards THEN the system SHALL use the formula: customer's global reward number multiplied by milestone factors (5, 25, 125, 500, 2500) to determine eligibility

### Requirement 2: Infinity Reward System

**User Story:** As a high-value customer who has completed the StepUp Reward journey, I want to earn continuous rewards for every 30,000 points I accumulate, so that I can receive ongoing benefits and additional global numbers.

#### Acceptance Criteria

1. WHEN a customer has completed the StepUp Reward journey AND has at least 30,000 reward points THEN the customer SHALL become eligible for Infinity Rewards
2. WHEN an eligible customer accumulates 30,000 points THEN the system SHALL deduct 6,000 points from their balance twice (total 12,000 points)
3. WHEN the first 6,000 points are deducted THEN the system SHALL distribute these points to merchants proportionally based on where the customer earned points
4. WHEN the second 6,000 points are deducted THEN the system SHALL generate 4 new global numbers (based on 1,500 points = 1 global number)
5. WHEN new global numbers are generated THEN the system SHALL add them to the customer's global number display separated by commas
6. WHEN a customer crosses another 30,000 point threshold THEN the system SHALL repeat the Infinity Reward process
7. WHEN Infinity Rewards are processed THEN the system SHALL send appropriate notifications to the customer

### Requirement 3: Affiliate Reward System

**User Story:** As a customer, I want to earn commission from customers I refer, so that I can benefit from bringing new users to the platform.

#### Acceptance Criteria

1. WHEN a customer refers another customer using a referral link THEN the system SHALL track the referral relationship
2. WHEN a referred customer makes a purchase THEN the system SHALL calculate 5% of the spending as commission points
3. WHEN commission points are calculated THEN the system SHALL add them to the referrer's point balance
4. WHEN a referral relationship is established THEN the system SHALL maintain it as lifetime valid
5. WHEN a referred customer becomes inactive THEN the system SHALL stop generating commission for the referrer
6. WHEN a referral link is generated THEN the system SHALL ensure it properly tracks the referrer-referee relationship
7. WHEN commission is earned THEN the system SHALL notify the referrer about the earned points

### Requirement 4: Integration and Display

**User Story:** As a customer, I want to see all my reward information clearly displayed in my dashboard, so that I can track my progress and benefits.

#### Acceptance Criteria

1. WHEN a customer views their dashboard THEN the system SHALL display their current global reward numbers
2. WHEN a customer has multiple global numbers THEN the system SHALL display them separated by commas
3. WHEN reward milestones are achieved THEN the system SHALL update the dashboard in real-time
4. WHEN Infinity Rewards are processed THEN the system SHALL show the updated point balance and new global numbers
5. WHEN affiliate commissions are earned THEN the system SHALL display referral earnings separately

### Requirement 5: Merchant Integration

**User Story:** As a merchant, I want to receive distributed points from customer Infinity Rewards, so that I can benefit from the loyalty program.

#### Acceptance Criteria

1. WHEN Infinity Reward points are distributed to merchants THEN the system SHALL calculate distribution based on the ratio of points originally given to the customer
2. WHEN points are distributed to merchants THEN the system SHALL update merchant point balances
3. WHEN merchant points are updated THEN the system SHALL notify merchants of the point addition
4. WHEN calculating distribution ratios THEN the system SHALL use historical transaction data to determine proportional allocation