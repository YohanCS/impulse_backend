var router = require('express').Router();
var asyncHandler = require('express-async-handler');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var passport = require('passport');
var request = require('request');
var moment = require('moment');
var promiseLimit = require('promise-limit');
var limit = promiseLimit(45);

var rp = require('request-promise');

const CLIENT_ID = "177279057869-n5j48p4vn7aucbkvjvcst1qc2j61mgsn.apps.googleusercontent.com";
const CLIENT_SECRET = "G-nCcH6MBOstMSgLqDTKwiRX";

const APP_STATUSES = ["Applied", "Rejected", "Interviewing", "Offer Received"];

const testData = [{
    "domain": "google.com",
    "name": "Google",
    "logo": "https://logo.clearbit.com/google.com",
    "website": "https://google.com",
    "location": "Mountain View, CA",
    "emails": [{
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "noreply@google.com",
            "domain": "google.com"
        },
        "date": "Sun, 03 Mar 2019 07:21:44 +0000",
        "subject": "Thanks for applying to Google",
        "id": "169426e14e7e6dc2",
        "snippet": "Hi John Kerr, Thanks for applying to Google! There are a ton of great companies out there, so we appreciate your interest in joining our team. While we&#39;re not able to reach out to every applicant,...",
        "status": "Rejected"
    }],
    "app_type": "individual",
    "recent_date": "Sun, 03 Mar 2019 07:21:44 +0000",
    "recent_status": "Rejected"
}, {
    "domain": "greenhouse.io",
    "name": "Greenhouse Software",
    "logo": "https://logo.clearbit.com/greenhouse.io",
    "website": "https://greenhouse.io",
    "location": "New York, NY",
    "emails": [{
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "no-reply@greenhouse.io",
            "domain": "greenhouse.io"
        },
        "date": "Sun, 03 Mar 2019 07:16:05 +0000",
        "subject": "What will you build at Roblox?",
        "id": "1694268ecaf48521",
        "snippet": "Hi John, Thank for your interest in the Data Scientist - Payments/Fraud role at Roblox. We&#39;re excited that you want to be a Robloxian and be part of the future of entertainment for all ages. We are...",
        "status": "Applied"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "no-reply@greenhouse.io",
            "domain": "greenhouse.io"
        },
        "date": "Sun, 03 Mar 2019 05:42:04 +0000",
        "subject": "Thank you for applying to PlayStation",
        "id": "1694212d806fad35",
        "snippet": "Hi John, Thank you for applying to PlayStation for the Software Engineer II opportunity. Your application has been received and will be reviewed. Please be on the lookout for future correspondence....",
        "status": "Applied"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "no-reply@greenhouse.io",
            "domain": "greenhouse.io"
        },
        "date": "Sun, 03 Mar 2019 05:41:04 +0000",
        "subject": "Thank you for applying to Bluebeam, Inc.",
        "id": "1694211f1713c074",
        "snippet": "Hi John, Thanks for wanting to join us at Bluebeam! This automated response means the following: • We received your resume! • A human being will read your materials. We promise! We don&#39;t just run...",
        "status": "Applied"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "no-reply@greenhouse.io",
            "domain": "greenhouse.io"
        },
        "date": "Sun, 03 Mar 2019 05:41:03 +0000",
        "subject": "Thank you for applying to Medely",
        "id": "1694211e8a026724",
        "snippet": "Hi John, Thank you so much for your interest in Medely. We wanted to let you know that we received your application for our Backend Software Engineer position, and we are thrilled that you would...",
        "status": "Applied"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "no-reply@greenhouse.io",
            "domain": "greenhouse.io"
        },
        "date": "Sun, 03 Mar 2019 05:37:04 +0000",
        "subject": "Thank you for applying to The Trade Desk",
        "id": "169420e42ebf8ae6",
        "snippet": "Hi John, Thank you for your interest in The Trade Desk! We appreciate you taking the time to apply for this role, and look forward to reviewing your application. Here&#39;s what you can expect from us:...",
        "status": "Applied"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "no-reply@greenhouse.io",
            "domain": "greenhouse.io"
        },
        "date": "Sun, 03 Mar 2019 05:36:03 +0000",
        "subject": "Thank you for applying to Bluebeam, Inc.",
        "id": "169420d55d66753b",
        "snippet": "Hi John, Thanks for wanting to join us at Bluebeam! This automated response means the following: • We received your resume! • A human being will read your materials. We promise! We don&#39;t just run...",
        "status": "Applied"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "no-reply@greenhouse.io",
            "domain": "greenhouse.io"
        },
        "date": "Sun, 03 Mar 2019 05:34:03 +0000",
        "subject": "Thank you for applying to ServiceTitan",
        "id": "169420b809f18e52",
        "snippet": "Hello John, Thank you for considering ServiceTitan as the next stop on your career journey. Your application to become a Titan has been received. We think you&#39;ve made a great choice (and we&#39;re...",
        "status": "Applied"
    }],
    "app_type": "common",
    "recent_date": "Sun, 03 Mar 2019 07:16:05 +0000",
    "recent_status": "Applied"
}, {
    "domain": "amazon.jobs",
    "name": "Amazon UK",
    "logo": "https://logo.clearbit.com/amazon.jobs",
    "website": "https://amazon.jobs",
    "location": "Seattle, WA",
    "emails": [{
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "noreply@amazon.jobs",
            "domain": "amazon.jobs"
        },
        "subject": "Thank you for applying to Amazon",
        "date": "Sun, 3 Mar 2019 07:15:09 +0000",
        "id": "16942680fcdfd913",
        "snippet": "Amazon Hi John, Thanks for applying to Amazon! We&#39;ve received your application for the position of Software Development Engineer, Amazon Studios (ID: 708681). What happens next? If we decide to...",
        "status": "Applied"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "noreply@amazon.jobs",
            "domain": "amazon.jobs"
        },
        "subject": "You've started your Amazon job application",
        "date": "Sun, 3 Mar 2019 07:10:53 +0000",
        "id": "169426424ef305bf",
        "snippet": "Amazon Hi John, Thank you for starting an application for the position of Software Development Engineer, Amazon Studios (ID: 708681). There are still a few steps you need to complete. Once your...",
        "status": "Applied"
    }],
    "app_type": "individual",
    "recent_date": "Sun, 3 Mar 2019 07:15:09 +0000",
    "recent_status": "Applied"
}, {
    "domain": "jobvite.com",
    "name": "Jobvite",
    "logo": "https://logo.clearbit.com/jobvite.com",
    "website": "https://jobvite.com",
    "location": "San Mateo, CA",
    "emails": [{
        "to": "John Kerr <impulsappdemo@gmail.com>",
        "from": {
            "email": "notification@jobvite.com",
            "domain": "jobvite.com"
        },
        "date": "Sun, 3 Mar 2019 07:14:01 +0000",
        "subject": "Your application for Software Engineer, Engine at Blizzard Entertainment",
        "id": "1694267047105af1",
        "snippet": "Dear John, Hello and thank you for your interest in Blizzard Entertainment. We see you&#39;ve applied for the position of Software Engineer, Engine - awesome, and good luck! We&#39;ve received your...",
        "status": "Applied"
    }],
    "app_type": "individual",
    "recent_date": "Sun, 3 Mar 2019 07:14:01 +0000",
    "recent_status": "Applied"
}, {
    "domain": "ceipal.com",
    "name": "CEIPAL",
    "logo": "https://logo.clearbit.com/ceipal.com",
    "website": "https://ceipal.com",
    "location": "Rochester, NY",
    "emails": [{
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "noreply@ceipal.com",
            "domain": "ceipal.com"
        },
        "subject": "Career Portal Registration Successful",
        "date": "Sat, 02 Mar 2019 23:58:26 -0600",
        "id": "1694221d8df0f6c3",
        "snippet": "Career Portal account Activation Request Dear John Kerr, Greetings from Vedainfo Inc! We wanted to let you know that your registration with Vedainfo Inc has been successful. Now you can login to View...",
        "status": "Applied"
    }],
    "app_type": "individual",
    "recent_date": "Sat, 02 Mar 2019 23:58:26 -0600",
    "recent_status": "Applied"
}, {
    "domain": "dice.com",
    "name": "Dice",
    "logo": "https://logo.clearbit.com/dice.com",
    "website": "https://dice.com",
    "location": "San Jose, CA",
    "emails": [{
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "applyonline@dice.com",
            "domain": "dice.com"
        },
        "date": "Sun, 03 Mar 2019 05:57:35 +0000",
        "subject": "Application for Dice Job Independent Consultant || Tableau Consultant (Redshift Experience) at Innovizant LLC",
        "id": "16942210bd3d5091",
        "snippet": "Dice The career hub for tech Application Submitted Thanks for applying for the position of Independent Consultant || Tableau Consultant (Redshift Experience) with Innovizant LLC through Dice. While you...",
        "status": "Interviewing"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "applyonline@dice.com",
            "domain": "dice.com"
        },
        "date": "Sun, 03 Mar 2019 05:57:33 +0000",
        "subject": "Application for Dice Job Business Analyst/Quality Analyst at Mobilyte",
        "id": "16942210578ad966",
        "snippet": "Dice The career hub for tech Application Submitted Thanks for applying for the position of Business Analyst/Quality Analyst with Mobilyte through Dice. While you wait to hear back, here are a few other...",
        "status": "Offer received :)"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "applyonline@dice.com",
            "domain": "dice.com"
        },
        "date": "Sun, 03 Mar 2019 05:56:42 +0000",
        "subject": "Application for Dice Job JAVA developer for San Jose, CA at Canvas InfoTech Inc.",
        "id": "16942203a49550d4",
        "snippet": "Dice The career hub for tech Application Submitted Thanks for applying for the position of JAVA developer for San Jose, CA with Canvas InfoTech Inc. through Dice. While you wait to hear back, here are...",
        "status": "Interviewing"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "applyonline@dice.com",
            "domain": "dice.com"
        },
        "date": "Sun, 03 Mar 2019 05:56:19 +0000",
        "subject": "Application for Dice Job Sr SAP Basis Administrator at Princeton IT Services",
        "id": "169421fe49e67546",
        "snippet": "Dice The career hub for tech Application Submitted Thanks for applying for the position of Sr SAP Basis Administrator with Princeton IT Services through Dice. While you wait to hear back, here are a...",
        "status": "Offer received :)"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "noreply@dice.com",
            "domain": "dice.com"
        },
        "subject": "Dice.com: Please verify your e-mail address",
        "date": "Sat,  2 Mar 2019 23:55:34 -0600 (CST)",
        "id": "169421f368c2fafe",
        "snippet": "Be more visible to employers Dice Career Connection Please verify your Dice email address to make your profile more visible to employers by clicking the button below. Verify Your Email Button not...",
        "status": "Applied"
    }],
    "app_type": "common",
    "recent_date": "Sun, 03 Mar 2019 05:57:35 +0000",
    "recent_status": "Interviewing"
}, {
    "domain": "glassdoor.com",
    "name": "Glassdoor",
    "logo": "https://logo.clearbit.com/glassdoor.com",
    "website": "https://glassdoor.com",
    "location": "Mill Valley, CA",
    "emails": [{
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "noreply@glassdoor.com",
            "domain": "glassdoor.com"
        },
        "date": "Sun, 03 Mar 2019 05:41:45 +0000 (UTC)",
        "subject": "Application to Sony PlayStation completed. Here''s what to do next.",
        "id": "16942128d7aef5ef",
        "snippet": "Give yourself the best chance to land a great job Glassdoor Your application was submitted Sony Playstation Software Engineer II Sony Playstation Your application was submitted at the address we have...",
        "status": "Rejected"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "noreply@glassdoor.com",
            "domain": "glassdoor.com"
        },
        "date": "Sun, 03 Mar 2019 05:40:46 +0000 (UTC)",
        "subject": "Application to Bluebeam, Inc. completed. Here''s what to do next.",
        "id": "1694211a47726861",
        "snippet": "Give yourself the best chance to land a great job Glassdoor Your application was submitted Bluebeam Software Engineering Manager (Cloud Application) Bluebeam Your application was submitted at the...",
        "status": "Offer received :)"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "noreply@glassdoor.com",
            "domain": "glassdoor.com"
        },
        "date": "Sun, 03 Mar 2019 05:40:11 +0000 (UTC)",
        "subject": "Application to Medely completed. Here''s what to do next.",
        "id": "16942111e92b9829",
        "snippet": "Give yourself the best chance to land a great job Glassdoor Your application was submitted Medely Backend Software Engineer Medely Your application was submitted at the address we have for Medely....",
        "status": "Offer received :)"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "noreply@glassdoor.com",
            "domain": "glassdoor.com"
        },
        "date": "Sun, 03 Mar 2019 05:39:43 +0000 (UTC)",
        "subject": "Application to Riot Games completed. Here''s what to do next.",
        "id": "1694210b0ba8ef3b",
        "snippet": "Give yourself the best chance to land a great job Glassdoor Your application was submitted Riot Games Software Engineer Riot Games Your application was submitted at the address we have for Riot Games....",
        "status": "Interviewing"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "noreply@glassdoor.com",
            "domain": "glassdoor.com"
        },
        "date": "Sun, 03 Mar 2019 05:37:27 +0000 (UTC)",
        "subject": "Application to HopSkipDrive completed. Here''s what to do next.",
        "id": "169420e9fadaa40e",
        "snippet": "Give yourself the best chance to land a great job Glassdoor Your application was submitted Hopskipdrive Software Engineer Hopskipdrive Your application was submitted at the address we have for...",
        "status": "Applied"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "noreply@glassdoor.com",
            "domain": "glassdoor.com"
        },
        "date": "Sun, 03 Mar 2019 05:37:03 +0000 (UTC)",
        "subject": "Application to Jazva completed. Here''s what to do next.",
        "id": "169420e418074f84",
        "snippet": "Give yourself the best chance to land a great job Glassdoor Your application was submitted Jazva Software Engineer Jazva Your application was submitted at the address we have for Jazva. Following up...",
        "status": "Rejected"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "noreply@glassdoor.com",
            "domain": "glassdoor.com"
        },
        "date": "Sun, 03 Mar 2019 05:36:28 +0000 (UTC)",
        "subject": "Application to The Trade Desk completed. Here''s what to do next.",
        "id": "169420db7de991f8",
        "snippet": "Give yourself the best chance to land a great job Glassdoor Your application was submitted The Trade Desk Software Engineer The Trade Desk Your application was submitted at the address we have for The...",
        "status": "Applied"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "noreply@glassdoor.com",
            "domain": "glassdoor.com"
        },
        "date": "Sun, 03 Mar 2019 05:35:35 +0000 (UTC)",
        "subject": "Application to Shinetech completed. Here''s what to do next.",
        "id": "169420ce6a6f1e6c",
        "snippet": "Give yourself the best chance to land a great job Glassdoor Your application was submitted Shinetech .NET Developer Shinetech Your application was submitted at the address we have for Shinetech....",
        "status": "Offer received :)"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "noreply@glassdoor.com",
            "domain": "glassdoor.com"
        },
        "date": "Sun, 03 Mar 2019 05:35:20 +0000 (UTC)",
        "subject": "Application to Bluebeam, Inc. completed. Here''s what to do next.",
        "id": "169420cadb4168be",
        "snippet": "Give yourself the best chance to land a great job Glassdoor Your application was submitted Bluebeam Principal Engineer Bluebeam Your application was submitted at the address we have for Bluebeam, Inc.....",
        "status": "Applied"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "noreply@glassdoor.com",
            "domain": "glassdoor.com"
        },
        "date": "Sun, 03 Mar 2019 05:34:38 +0000 (UTC)",
        "subject": "Application to Consilio, LLC completed. Here''s what to do next.",
        "id": "169420c0beb7a9ad",
        "snippet": "Give yourself the best chance to land a great job Glassdoor Your application was submitted Consilio Application Support Engineer Consilio Your application was submitted at the address we have for...",
        "status": "Rejected"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "noreply@glassdoor.com",
            "domain": "glassdoor.com"
        },
        "date": "Sun, 03 Mar 2019 05:33:55 +0000 (UTC)",
        "subject": "Application to Morley Builders completed. Here''s what to do next.",
        "id": "169420b60756acbf",
        "snippet": "Give yourself the best chance to land a great job Glassdoor Your application was submitted Morley Builders Project Engineer Morley Builders Your application was submitted at the address we have for...",
        "status": "Rejected"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "noreply@glassdoor.com",
            "domain": "glassdoor.com"
        },
        "date": "Sun, 03 Mar 2019 05:33:42 +0000 (UTC)",
        "subject": "Application to ServiceTitan completed. Here''s what to do next.",
        "id": "169420b2eaf0cd6a",
        "snippet": "Give yourself the best chance to land a great job Glassdoor Your application was submitted Servicetitan Software Engineer Servicetitan Your application was submitted at the address we have for...",
        "status": "Interviewing"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "noreply@glassdoor.com",
            "domain": "glassdoor.com"
        },
        "date": "Sun, 03 Mar 2019 05:32:40 +0000 (UTC)",
        "subject": "Application to Net Consensus Inc completed. Here''s what to do next.",
        "id": "169420a3e6abdd00",
        "snippet": "Give yourself the best chance to land a great job Glassdoor Your application was submitted Net Consensus Software Developer Net Consensus Your application was submitted at the address we have for Net...",
        "status": "Offer received :)"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "noreply@glassdoor.com",
            "domain": "glassdoor.com"
        },
        "date": "Sun, 03 Mar 2019 05:32:30 +0000 (UTC)",
        "subject": "Application to Event Farm completed. Here''s what to do next.",
        "id": "169420a172087842",
        "snippet": "Give yourself the best chance to land a great job Glassdoor Your application was submitted Event Farm Full Stack Software Engineer Event Farm Your application was submitted at the address we have for...",
        "status": "Rejected"
    }, {
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "noreply@glassdoor.com",
            "domain": "glassdoor.com"
        },
        "date": "Sun, 03 Mar 2019 05:32:14 +0000 (UTC)",
        "subject": "Application to Optical Zonu Corp completed. Here''s what to do next.",
        "id": "1694209d99aa739e",
        "snippet": "Give yourself the best chance to land a great job Glassdoor Your application was submitted Optical Zonu Corp Firmware Engineer Optical Zonu Corp Your application was submitted at the address we have...",
        "status": "Offer received :)"
    }],
    "app_type": "common",
    "recent_date": "Sun, 03 Mar 2019 05:41:45 +0000 (UTC)",
    "recent_status": "Rejected"
}, {
    "domain": "riotgames.com",
    "name": "Riot Games",
    "logo": "https://logo.clearbit.com/riotgames.com",
    "website": "https://riotgames.com",
    "location": "Los Angeles, CA",
    "emails": [{
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "no-reply@riotgames.com",
            "domain": "riotgames.com"
        },
        "date": "Sun, 03 Mar 2019 05:40:04 +0000",
        "subject": "Thank you for applying to Software Engineer at Riot Games",
        "id": "1694211090688c96",
        "snippet": "John, Thanks for applying to the Software Engineer position at Riot Games. We&#39;re excited Riot sparked your interest and appreciate the time it takes to craft an application. You&#39;ll hear from us...",
        "status": "Rejected"
    }],
    "app_type": "individual",
    "recent_date": "Sun, 03 Mar 2019 05:40:04 +0000",
    "recent_status": "Rejected"
}, {
    "domain": "applytojob.com",
    "name": "JazzHR",
    "logo": "https://logo.clearbit.com/jazzhr.com",
    "website": "https://applytojob.com",
    "location": "Pittsburgh, PA",
    "emails": [{
        "to": "John Kerr <impulsappdemo@gmail.com>",
        "from": {
            "email": "noreply@applytojob.com",
            "domain": "applytojob.com"
        },
        "date": "3 Mar 2019 00:37:26 -0500",
        "subject": "Your application has been received",
        "id": "169420e9b71d418f",
        "snippet": "Hi John, We have received your application for the HopSkipDrive Software Engineer role! We appreciate you taking time to send your resume and cover letter for our review. We will be reviewing the...",
        "status": "Interviewing"
    }],
    "app_type": "individual",
    "recent_date": "3 Mar 2019 00:37:26 -0500",
    "recent_status": "Interviewing"
}, {
    "domain": "candidates.workablemail.com",
    "name": "Workable",
    "logo": "https://logo.clearbit.com/workable.com",
    "website": "https://candidates.workablemail.com",
    "location": "Boston, MA",
    "emails": [{
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "noreply@candidates.workablemail.com",
            "domain": "candidates.workablemail.com"
        },
        "date": "Sun, 03 Mar 2019 05:37:04 +0000",
        "subject": "Thanks for applying to Jazva",
        "id": "169420e4561ae9e0",
        "snippet": "Jazva Your application for the Software Engineer job was submitted successfully. Here&#39;s a copy of your application data for safekeeping: Personal Information Name John Kerr Email impulsappdemo@...",
        "status": "Interviewing"
    }],
    "app_type": "individual",
    "recent_date": "Sun, 03 Mar 2019 05:37:04 +0000",
    "recent_status": "Interviewing"
}, {
    "domain": "app.bamboohr.com",
    "name": "BambooHR",
    "logo": "https://logo.clearbit.com/bamboohr.com",
    "website": "https://app.bamboohr.com",
    "location": "Lindon, UT",
    "emails": [{
        "to": "John Kerr <impulsappdemo@gmail.com>",
        "from": {
            "email": "notifications@app.bamboohr.com",
            "domain": "app.bamboohr.com"
        },
        "date": "Sun, 03 Mar 2019 05:34:41 +0000",
        "subject": "Thank you for applying at Consilio, LLC",
        "id": "169420c15c97c709",
        "snippet": "Thanks John! We received your application. Thanks John! We received your application. Hi John, Thank you so much for your interest in Consilio, LLC and for taking the time to apply for the Application...",
        "status": "Interviewing"
    }],
    "app_type": "individual",
    "recent_date": "Sun, 03 Mar 2019 05:34:41 +0000",
    "recent_status": "Interviewing"
}, {
    "domain": "invalidemail.com",
    "website": "https://invalidemail.com",
    "location": "U.S.A.",
    "emails": [{
        "to": "impulsappdemo@gmail.com",
        "from": {
            "email": "donotreply@invalidemail.com",
            "domain": "invalidemail.com"
        },
        "subject": "Thank you from Green Dot Corp.",
        "date": "Sun,  3 Mar 2019 05:30:34 +0000 (UTC)",
        "id": "16942084f550e3e2",
        "snippet": "Thank you for submitting your application for the Software Engineer position. Our team is reviewing your qualifications and will contact you if there is a match with our current open positions. We...",
        "status": "Applied"
    }],
    "app_type": "individual",
    "recent_date": "Sun,  3 Mar 2019 05:30:34 +0000 (UTC)",
    "recent_status": "Applied"
}, {
    "domain": "joshchen.me",
    "website": "https://joshchen.me",
    "location": "U.S.A.",
    "emails": [{
        "to": "\"impulsappdemo@gmail.com\" <impulsappdemo@gmail.com>",
        "from": {
            "email": "josh@joshchen.me",
            "domain": "joshchen.me"
        },
        "date": "Sun, 03 Mar 2019 00:06:30 +0000",
        "subject": "Fwd: BlackRock | Application Update",
        "id": "16940dfa812cffab",
        "snippet": "Sent from ProtonMail Mobile ---------- Forwarded message ---------- From: &lt;noreply@blackrock.tal.net&gt; Date: On Sun, Dec 16, 2018 at 5:51 AM Subject: Fwd: BlackRock | Application Update To: &lt;...",
        "status": "Rejected"
    }],
    "app_type": "individual",
    "recent_date": "Sun, 03 Mar 2019 00:06:30 +0000",
    "recent_status": "Rejected"
}];

const LABELS = [{
        name: "Impuls: Status - Applied",
        color: "#a4c2f4",
        messageLabel: "Applied"
    },
    {
        name: "Impuls: Status - Rejected",
        color: "#fb4c2f",
        messageLabel: "Rejected"
    },
    {
        name: "Impuls: Status - Interviewing",
        color: "#434343",
        messageLabel: "Interviewing"
    },
    {
        name: "Impuls: Status - Offer Received",
        color: "#16a766",
        messageLabel: "Offer Received"
    }
];

passport.use(new GoogleStrategy({
        clientID: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        callbackURL: process.env.CALLBACK,
        passReqToCallback: true
    },
    async function (req, accessToken, refreshToken, profile, done) {
        try {
            done(JSON.stringify(await performSequence(accessToken)));
        } catch (e) {
            console.log(e);
            done(`Error! Something went wrong. Could it be an invalid or expired 'accessCode' query?`);
        }
    }));

async function performSequence(accessToken) {
    console.log(`ACCESS CODE: ${accessToken}`);
    await resetLabels(accessToken);
    var emailsList = await getEmailsList(accessToken);
    var rawEmailObjects = await Promise.all(analyzeEmails(accessToken, emailsList));
    var parsedEmailObjects = getFields(rawEmailObjects);

    // var labelIds = await getLabelIds(accessToken);
    // var labelEmailReqs = labelEmails(accessToken, parsedEmailObjects, labelIds);
    // await Promise.all(labelEmailReqs);

    var mergedResult = await mergeDomains(parsedEmailObjects);
    return mergedResult;
}

function labelEmails(accessToken, parsedEmailObjects, labelIds) {
    var labelReqs = [];
    var labelReqOptions = [];
    for (var index = 0; index < parsedEmailObjects.length; index++) {
        var currentEmail = parsedEmailObjects[index];
        var options = {
            method: 'POST',
            url: `https://www.googleapis.com/gmail/v1/users/me/messages/${currentEmail.id}/modify`,
            headers: {
                authorization: 'Bearer ' + accessToken,
                'content-type': 'application/json'
            },
            body: {
                "addLabelIds": labelIds.filter(current => current.messageLabel == currentEmail.status).map(current => current.id),
            },
            json: true
        };
        labelReqOptions.push(options);
        labelReqs.push(limit(() => rp(options)));
    }
    return labelReqs;
}

router.get('/', function (req, res, next) {
    res.send("This is the main sub-API for Impuls! :)");
});

router.get('/ping', function (req, res, next) {
    res.send("pong");
});

router.get('/test_data', function (req, res, next) {
    res.json(testData);
});

router.get('/get_emails', asyncHandler(async (req, res, next) => {
    if (typeof req.query.accessToken != 'undefined' && req.query.accessToken != '') {
        try {
            res.json(await performSequence(req.query.accessToken));
        } catch (e) {
            console.log("HERE: " + e);
            res.status(500).send(`Error! Something went wrong. Could it be an invalid or expired 'accessToken' query?`);
        }
    } else {
        res.status(404).send(`Missing 'accessToken' query.`);
    }
}));

router.get('/auth',
    passport.authenticate('google', {
        scope: ['https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://mail.google.com/',
            'https://www.googleapis.com/auth/gmail.labels'
        ]
    }));

router.get('/callback',
    passport.authenticate('google', {
        failureRedirect: '/'
    }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/');
    });

function getEmailsList(accessToken) {
    var options = {
        method: 'GET',
        url: `https://www.googleapis.com/gmail/v1/users/me/messages`,
        headers: {
            'Authorization': 'Bearer ' + accessToken
        },
        json: true
    };

    return new Promise(function (resolve, reject) {
        request(options, function (error, response, body) {
            if (error) {
                reject(error);
            } else {
                resolve(body);
            }
        });
    });
}

function analyzeEmails(accessToken, messageList) {
    var reqs = [];
    messageList.messages.forEach(function (currentMessage) {
        var options = {
            method: 'GET',
            url: `https://www.googleapis.com/gmail/v1/users/me/messages/${currentMessage.id}`,
            headers: {
                'Authorization': 'Bearer ' + accessToken
            },
            json: true
        };

        reqs.push(new Promise(function (resolve, reject) {
            request(options, function (error, response, body) {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        }));
    });
    return reqs;
}

function getFields(emailObjects) {
    var rets = [];
    for (var index = 0; index < emailObjects.length; index++) {
        var emailObject = emailObjects[index];
        var ret = {};
        emailObject.payload.headers.forEach(function (header) {
            if (header.name == "From" || header.name == "Return-Path") {
                ret.from = {};
                var tempEmail = header.value;
                tempEmail = tempEmail.substring(tempEmail.indexOf("<") + 1, tempEmail.indexOf(">"));
                ret.from.email = tempEmail;
                if (tempEmail.length < 5) {
                    ret.from.email = header.value;
                }
                ret.from.domain = ret.from.email.substring(ret.from.email.indexOf("@") + 1, ret.from.email.length);
            } else if (header.name == "To" || header.name == "Delivered-To") {
                ret.to = header.value;
            } else if (header.name == "Subject") {
                ret.subject = header.value;
            } else if (header.name == "Date") {
                ret.date = header.value;
            }
        });
        ret.id = emailObject.id;
        ret.snippet = emailObject.snippet + "...";
        ret.status = APP_STATUSES[getRandomInt(4)];
        rets.push(ret);
    }
    return rets;
}

async function mergeDomains(emailInfo) {
    var finalRet = [];
    var uniqueEmails = emailInfo.map(current => current.from.email).filter(onlyUnique);
    var uniqueDomains = uniqueEmails.map(current => current.substring(current.indexOf("@") + 1, current.length));
    uniqueDomains = uniqueDomains.filter(onlyUnique);
    var reqs = [];
    for (var index = 0; index < uniqueDomains.length; index++) {
        var currentDomain = uniqueDomains[index];
        var current = {};
        current.domain = currentDomain;
        var domainInfo = await getDomainInfo(current.domain);
        current.name = domainInfo.name;
        current.logo = domainInfo.logo;
        current.website = "https://" + current.domain;
        try {
            current.location = `${domainInfo.geo.city}, ${domainInfo.geo.stateCode}`;
        } catch (e) {
            current.location = `U.S.A.`;
        }
        current.emails = emailInfo.filter(function (currentMessage) {
            var currentEmail = currentMessage.from.email;
            return emailMatchesDomain(currentEmail, current.domain);
        });
        current.app_type = current.emails.length >= 5 ? "common" : "individual";
        current.recent_date = current.emails[0].date;
        current.recent_status = current.emails[0].status;
        for (var emailIndex = 1; emailIndex < current.emails.length; emailIndex++) {
            if (moment(current.emails[emailIndex].date).isAfter(moment(current.recent_date))) {
                current.recent_date = current.emails[emailIndex].date;
                current.recent_status = current.emails[emailIndex].status;
            }
        }
        finalRet.push(current);
    }
    return finalRet;
}

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

function emailMatchesDomain(email, domain) {
    return email.substring(email.indexOf("@") + 1, email.length).trim() == domain;
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function getDomainInfo(domain) {
    var options = {
        method: 'GET',
        url: 'https://company.clearbit.com/v2/companies/find',
        qs: {
            domain
        },
        headers: {
            authorization: 'Bearer sk_2ad0b011e1c982db6115fe8ab4225850'
        },
        json: true
    };

    return new Promise((resolve, reject) => {
        request(options, function (error, response, body) {
            if (error) {
                reject(error);
            } else {
                resolve(body);
            }
        });
    });
}

function addLabel(accessToken, name, color) {
    var options = {
        method: 'POST',
        url: `https://www.googleapis.com/gmail/v1/users/me/labels`,
        headers: {
            authorization: 'Bearer ' + accessToken,
            'content-type': 'application/json'
        },
        body: {
            "labelListVisibility": "labelShow",
            "messageListVisibility": "show",
            "name": name,
            "color": {
                "backgroundColor": color,
                "textColor": "#ffffff"
            }
        },
        json: true
    };
    return new Promise((resolve, reject) => {
        request(options, function (error, response, body) {
            if (error) {
                reject(error);
            } else {
                resolve(body);
            }
        });
    });
}

async function resetLabels(accessToken) {
    var options = {
        method: 'GET',
        url: 'https://www.googleapis.com/gmail/v1/users/me/labels',
        headers: {
            authorization: 'Bearer ' + accessToken
        },
        json: true
    };
    var gmailLabels = await new Promise((resolve, reject) => {
        request(options, function (error, response, body) {
            if (error)
                reject(error);
            else
                resolve(body);
        });
    });
    const labelsToDelete = gmailLabels.labels.filter(function (currentLabel) {
        return LABELS.map(current => current.name).indexOf(currentLabel.name) != -1;
    });
    var reqs = [];
    labelsToDelete.forEach(function (current) {
        reqs.push(new Promise((resolve, reject) => {
            var options = {
                method: 'DELETE',
                url: `https://www.googleapis.com/gmail/v1/users/me/labels/${current.id}`,
                headers: {
                    authorization: 'Bearer ' + accessToken
                },
                json: true
            };
            request(options, function (error, response, body) {
                if (error)
                    reject(error);
                else
                    resolve(body);
            });
        }));
    });
    await Promise.all(reqs);
    var addLabelRequests = [];
    LABELS.forEach(function (currentLabel) {
        addLabelRequests.push(addLabel(accessToken, currentLabel.name, currentLabel.color));
    });
    await Promise.all(addLabelRequests);
}

function getLabelIds(accessToken) {
    var options = {
        method: 'GET',
        url: 'https://www.googleapis.com/gmail/v1/users/me/labels',
        headers: {
            authorization: 'Bearer ' + accessToken
        },
        json: true
    };
    return new Promise((resolve, reject) => {
        request(options, function (error, response, body) {
            if (error)
                reject(error);
            else {
                var newLabels = LABELS.slice(0);
                for (var i = 0; i < body.labels.length; i++) {
                    for (var j = 0; j < newLabels.length; j++) {
                        if (body.labels[i].name == newLabels[j].name) {
                            newLabels[j].id = body.labels[i].id;
                        }
                    }
                }
                resolve(newLabels);
            }
        });
    });
}

module.exports = router;