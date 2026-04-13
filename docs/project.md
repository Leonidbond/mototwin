Product Name

MotoTwin

Product Type

Web application / mobile-friendly digital garage for motorcycle owners

Product Summary

MotoTwin is a digital garage for motorcycle owners. The product helps users store their motorcycle profile, track service history, receive maintenance reminders, find compatible parts for specific nodes, and track ownership expenses.

MotoTwin MVP is not a marketplace and not a full spare parts catalog. It is a service-centered digital garage focused on real ownership workflow.  ￼

Core Value Proposition

Your motorcycle in one interface: nodes, service history, reminders, compatible parts, and ownership expenses.

MVP Goal

Validate that motorcycle owners need one product where they can:
	•	add their motorcycle;
	•	track service and maintenance status;
	•	understand what needs attention;
	•	find compatible parts without mistakes;
	•	track expenses in one place.

Initial Scope

The MVP must start with a limited and controlled scope:
	•	brands: BMW and KTM;
	•	limited number of popular models and variants;
	•	limited set of supported maintenance nodes;
	•	structured fitment data;
	•	Free and Pro plan foundation.

This is a data-first MVP, not a mass-market-first MVP.  ￼

Supported Brands in MVP
	•	BMW
	•	KTM

Main Product Principles
	1.	The product must be built around motorcycle ownership workflow, not around catalog browsing.
	2.	Fitment must be based on structured data, not LLM guessing.
	3.	Maintenance and reminders are core value, not secondary features.
	4.	The interface must be simple, clear, and credible.
	5.	The public landing page must look strong enough for a CEO, investor, strategic partner, or first user.

Public Landing Page

The MVP must include a public start page before authentication.

Landing Page Purpose

The landing page must:
	•	explain what MotoTwin is;
	•	explain the value of the product;
	•	present the service clearly and credibly;
	•	provide login and registration entry points;
	•	create a strong first impression.

Landing Page Tone

The landing page must be:
	•	concise;
	•	structured;
	•	confident;
	•	product-oriented;
	•	not overloaded with technical details;
	•	without cheap marketing language.

Landing Page Audience

The landing page must look credible for:
	•	motorcycle owners;
	•	CEO;
	•	investor;
	•	strategic partner;
	•	development contractor.

Landing Page Mandatory Blocks
	1.	Hero section
	2.	What the service does
	3.	How it works
	4.	Why it is useful
	5.	Who it is for
	6.	Product statement / trust block
	7.	Login / signup block

Landing Page Hero

Must contain:
	•	MotoTwin name;
	•	headline;
	•	subheadline;
	•	Login button;
	•	Sign up button.

Recommended headline:
MotoTwin — digital garage for your motorcycle

Recommended subheadline:
Nodes, service history, reminders, compatible parts, and expenses in one interface.

Landing Page Product Statement

Recommended statement:
MotoTwin is not just a parts catalog. It is a motorcycle ownership system: from vehicle profile to service, expenses, and compatible component selection.

Landing Page Required Product Message

The landing page must clearly communicate:
	•	what MotoTwin is;
	•	what problem it solves;
	•	who it is for;
	•	what functions are included in the MVP;
	•	that the MVP starts with BMW and KTM;
	•	that the product is built around service, fitment, and expense tracking.

This requirement is based on the updated MVP definition with a CEO-level start page.  ￼

MVP Features

The MVP must include the following modules.

1. Authentication

The system must support:
	•	sign up;
	•	login;
	•	logout;
	•	password recovery.

2. Garage

The user can:
	•	create a garage;
	•	add one motorcycle in Free plan;
	•	open motorcycle dashboard.

3. Vehicle Profile

The user can store:
	•	brand;
	•	model;
	•	year;
	•	variant;
	•	VIN;
	•	odometer;
	•	engine hours if applicable.

VIN is allowed only as an assistive field, not as the only source of truth.  ￼

4. Ride Profile

The user can define:
	•	city / highway / mixed / off-road;
	•	calm / active / aggressive riding;
	•	solo / passenger / luggage;
	•	usage intensity.

5. Top Nodes

The system must show top-level motorcycle nodes and current status.

6. Service Log

The user can add service events with:
	•	date;
	•	odometer / engine hours;
	•	node;
	•	service type;
	•	installed parts;
	•	cost;
	•	comment.

7. Reminder Engine

The system must calculate and show statuses:
	•	OK
	•	Soon
	•	Overdue
	•	Recently replaced

8. Fitment

The user can open a node and see:
	•	compatible parts;
	•	top 3 recommendations:
	•	Best fit
	•	Best value
	•	Best for your riding style

9. Expense Tracking

The user can:
	•	add expenses;
	•	view total expenses by motorcycle;
	•	view expenses by node.

10. Freemium Foundation

The MVP must include:
	•	Free plan;
	•	Pro plan;
	•	UI differentiation;
	•	feature gating at architecture and UI level.

Out of Scope for MVP

The MVP must not include:
	•	full VIN decoding as the only identification mechanism;
	•	full global motorcycle catalog;
	•	all brands and models;
	•	social/community layer;
	•	marketplace;
	•	connected hardware;
	•	CAN / telemetry integration;
	•	gear module;
	•	B2B API;
	•	white-label;
	•	mechanic mode;
	•	advanced resale-card;
	•	car support.  ￼

Primary User Flows

Flow 0 — Entry through Landing Page
	1.	User opens public landing page.
	2.	User understands what MotoTwin is.
	3.	User sees product value.
	4.	User clicks login or sign up.
	5.	User enters onboarding.

Flow 1 — Add First Motorcycle
	1.	User signs up or logs in.
	2.	User starts onboarding.
	3.	User selects brand.
	4.	User selects model.
	5.	User selects year and variant.
	6.	User enters odometer.
	7.	User optionally enters VIN.
	8.	User defines ride profile.
	9.	Motorcycle is created.

Flow 2 — View Motorcycle Status
	1.	User opens garage home.
	2.	User sees:
	•	motorcycle summary;
	•	reminders;
	•	node statuses;
	•	recent service events;
	•	expense summary.

Flow 3 — Add Service Event
	1.	User opens service log.
	2.	User clicks add service event.
	3.	User fills:
	•	date;
	•	odometer / engine hours;
	•	node;
	•	service type;
	•	installed parts;
	•	cost;
	•	comment.
	4.	Event is saved.
	5.	Statuses and reminders are recalculated.

Flow 4 — Open Node and See Fitment
	1.	User opens nodes overview.
	2.	User selects a node.
	3.	User sees:
	•	node status;
	•	service history;
	•	next due service;
	•	compatible parts;
	•	top 3 recommendations.

Flow 5 — Add Expense
	1.	User opens expenses.
	2.	User adds expense entry.
	3.	User fills:
	•	date;
	•	category;
	•	node;
	•	amount;
	•	comment.
	4.	Totals are recalculated.

Main Screens

1. Public Landing Page

Contains:
	•	hero;
	•	product value;
	•	how it works;
	•	benefits;
	•	audience;
	•	trust statement;
	•	login / signup actions.

2. Onboarding

Contains:
	•	brand selection;
	•	model selection;
	•	year;
	•	variant;
	•	VIN;
	•	odometer;
	•	ride profile.

3. Garage Home

Contains:
	•	motorcycle card;
	•	reminders summary;
	•	node statuses;
	•	recent service events;
	•	expenses summary.

4. Vehicle Detail

Contains:
	•	brand;
	•	model;
	•	variant;
	•	year;
	•	VIN;
	•	odometer;
	•	engine hours;
	•	ride profile.

5. Nodes Overview

Contains:
	•	top-level nodes;
	•	statuses:
	•	OK
	•	Soon
	•	Overdue
	•	Recently replaced

6. Node Detail

Contains:
	•	node title;
	•	current status;
	•	service history;
	•	next due maintenance;
	•	compatible parts;
	•	top 3 recommendations;
	•	node expenses.

7. Service Log

Contains:
	•	list of service events;
	•	add service event form.

8. Expenses

Contains:
	•	list of expense events;
	•	total by motorcycle;
	•	total by node.

9. Subscription / Pro

Contains:
	•	Free limits;
	•	Pro benefits;
	•	upgrade CTA.

Priority Nodes for MVP

The initial supported nodes must include:
	•	engine oil;
	•	oil filter;
	•	air filter;
	•	spark plug;
	•	brake pads;
	•	brake discs;
	•	chain;
	•	sprockets;
	•	battery;
	•	tires;
	•	basic cooling consumables;
	•	basic brake system consumables.  ￼

Domain Model

User

Fields:
	•	id
	•	email
	•	password_hash or auth_provider_id
	•	created_at
	•	updated_at

Subscription

Fields:
	•	id
	•	user_id
	•	plan_type
	•	status
	•	started_at
	•	ends_at

Brand

Fields:
	•	id
	•	name
	•	slug

Model

Fields:
	•	id
	•	brand_id
	•	name
	•	slug

ModelVariant

Fields:
	•	id
	•	model_id
	•	year
	•	generation
	•	version_name
	•	market
	•	engine_type
	•	cooling_type
	•	wheel_sizes
	•	brake_system
	•	chain_pitch
	•	stock_sprockets

Vehicle

Fields:
	•	id
	•	user_id
	•	brand_id
	•	model_id
	•	model_variant_id
	•	nickname
	•	vin
	•	odometer
	•	engine_hours
	•	created_at
	•	updated_at

RideProfile

Fields:
	•	id
	•	vehicle_id
	•	usage_type
	•	riding_style
	•	load_type
	•	usage_intensity

Node

Fields:
	•	id
	•	code
	•	name
	•	parent_id nullable
	•	level
	•	display_order

ServiceRule

Fields:
	•	id
	•	model_variant_id
	•	node_id
	•	operation_name
	•	interval_days nullable
	•	interval_km nullable
	•	interval_hours nullable
	•	trigger_type

PartMaster

Fields:
	•	id
	•	brand_name
	•	sku
	•	title
	•	category_code
	•	description
	•	attributes_json
	•	is_active

FitmentRule

Fields:
	•	id
	•	model_variant_id
	•	node_id
	•	part_id
	•	fitment_type
	•	confidence_score
	•	conditions_json nullable

ServiceEvent

Fields:
	•	id
	•	vehicle_id
	•	node_id
	•	event_date
	•	odometer
	•	engine_hours
	•	service_type
	•	installed_parts_json
	•	cost_amount
	•	currency
	•	comment

ExpenseEvent

Fields:
	•	id
	•	vehicle_id
	•	node_id nullable
	•	expense_date
	•	category
	•	amount
	•	currency
	•	comment

Reminder

Fields:
	•	id
	•	vehicle_id
	•	node_id
	•	status
	•	next_due_date nullable
	•	next_due_odometer nullable
	•	next_due_engine_hours nullable
	•	generated_at

Fitment Logic

Source of Truth

Fitment must be based on:
	•	model variant;
	•	node;
	•	fitment rules;
	•	compatible SKU list.

LLM must not be used as the source of truth. It can only be used as a support layer.  ￼

Fitment Output

For supported nodes, the system must return:
	•	compatible parts list;
	•	top 3 recommendations:
	•	Best fit
	•	Best value
	•	Best for your riding style

Ride Profile Effect

Ride profile can affect recommendation ranking for:
	•	brake pads;
	•	tires;
	•	possibly chain.

Allowed AI Usage

AI may be used only for:
	•	text normalization;
	•	recommendation explanation;
	•	title enrichment;
	•	pros/cons generation.

Maintenance Logic

Reminder Engine Inputs

The reminder engine must use:
	•	service rules;
	•	vehicle odometer;
	•	vehicle engine hours;
	•	service history.

Maintenance Statuses

Each tracked node must have one of the following statuses:
	•	OK
	•	Soon
	•	Overdue
	•	Recently replaced

Rule Logic

Each service rule may include:
	•	time interval;
	•	mileage interval;
	•	engine-hours interval;
	•	whichever-comes-first principle.

Expense Logic

Categories

Supported categories:
	•	parts;
	•	consumables;
	•	service labor;
	•	tires;
	•	unexpected repair.

Expense Output

The system must show:
	•	amount per expense event;
	•	total expenses by motorcycle;
	•	total expenses by node.

Free / Pro Logic

Free Plan

Must include:
	•	1 motorcycle;
	•	basic profile;
	•	basic reminders;
	•	limited service log;
	•	limited fitment;
	•	basic expense tracking.

Pro Plan

Must include:
	•	extended service log;
	•	more fitment results;
	•	ride-profile-based recommendations;
	•	richer history;
	•	enhanced reminders;
	•	future support for multiple motorcycles.

Billing may be mocked in MVP, but plan logic and UI separation must exist from the beginning.

API Requirements

Public
	•	GET /landing-content

Auth / User
	•	POST /auth/signup
	•	POST /auth/login
	•	POST /auth/logout
	•	POST /auth/forgot-password
	•	GET /me

Garage / Vehicle
	•	GET /vehicles
	•	POST /vehicles
	•	GET /vehicles/:id
	•	PATCH /vehicles/:id

Ride Profile
	•	GET /vehicles/:id/ride-profile
	•	PUT /vehicles/:id/ride-profile

Nodes
	•	GET /vehicles/:id/nodes
	•	GET /vehicles/:id/nodes/:nodeId

Service Log
	•	GET /vehicles/:id/service-events
	•	POST /vehicles/:id/service-events

Reminders
	•	GET /vehicles/:id/reminders

Fitment
	•	GET /vehicles/:id/fitment?nodeId=...

Expenses
	•	GET /vehicles/:id/expenses
	•	POST /vehicles/:id/expenses

Subscription
	•	GET /subscription
	•	POST /subscription/upgrade

Admin / Internal Data Tools

The MVP should include a simple internal admin or internal data tool for:
	•	brands;
	•	models;
	•	model variants;
	•	nodes;
	•	service rules;
	•	parts;
	•	fitment rules;
	•	data import.

This admin does not need polished UX.
Its goal is to support data-first product development.

Non-Functional Requirements

The MVP must be:
	•	responsive;
	•	fast;
	•	easy to navigate;
	•	easy to expand with more catalog data;
	•	easy to maintain in Cursor;
	•	structured for future extension.

Recommended technical direction:
	•	TypeScript
	•	Next.js
	•	PostgreSQL
	•	Prisma
	•	mobile-friendly UI

Acceptance Criteria

MotoTwin MVP is considered complete if:
	1.	A new user can open the landing page and understand the product immediately.
	2.	A new user can sign up or log in.
	3.	A user can add a BMW or KTM motorcycle.
	4.	A user can define odometer and ride profile.
	5.	A user can see top-level node statuses.
	6.	A user can add a service event.
	7.	The system recalculates reminders and statuses.
	8.	A user can open a node and see compatible parts.
	9.	A user can see top 3 recommendations.
	10.	A user can add expenses.
	11.	A user can see total expenses.
	12.	A user can see Free vs Pro differentiation.

Implementation Priority

Build in this order:
	1.	Public landing page
	2.	Auth
	3.	Vehicle creation
	4.	Garage home
	5.	Service log
	6.	Reminder engine
	7.	Nodes overview
	8.	Node detail + fitment
	9.	Expenses
	10.	Pro gating

Final Definition

MotoTwin MVP is a digital garage application for BMW and KTM motorcycle owners that starts with a strong public landing page and authentication, then allows users to add a motorcycle, track service history, view node statuses, get maintenance reminders, find compatible parts, and track ownership expenses. Fitment is based on structured data, not LLM guessing. Monetization model is freemium.