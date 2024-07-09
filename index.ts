process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

import https from "node:https";
import fs from "node:fs";
import { JSDOM } from "jsdom";

type Course = {
    code: string;
    number: string;
}

const courseListUrl = "https://www.sis.itu.edu.tr/EN/student/undergraduate/course-plans/plans/BLGE/201810.html";
const courseListFilename = "CourseList.html";


function GetCourseCodes(document: Document): Course[] {
    const elements: NodeListOf<HTMLAnchorElement> = document.querySelectorAll('a[title="Click For Course Catalogue Form."]');
    const result: Course[] = [];
    const regex = /\s+/;
    elements.forEach((element) => {
        const splits = element.innerHTML.split(regex);
        result.push({ code: splits[0], number: splits[1] });
    });
    return result;
}

function GetCourseList(data: string) {
    const jsdom = new JSDOM(data, { url: courseListUrl });
    const courseCodes = GetCourseCodes(jsdom.window.document);
    courseCodes.forEach((course) => {
        console.log(JSON.stringify(course));
    });
}

if (fs.existsSync(courseListFilename)) {
    console.log("Reading from cache: " + courseListFilename);
    const data = fs.readFileSync(courseListFilename).toString();
    GetCourseList(data);
} else {
    console.log("No cache found! Downloading...");
    https.get(courseListUrl, (response) => {
        console.log("Got response: ", response.statusCode);
        let data = "";
        response.on("data", (chunk) => { data += chunk });
        response.on("end", () => {
            console.log("Writing cache: " + courseListFilename);
            fs.writeFileSync(courseListFilename, data);
            GetCourseList(data);
        });
    }).on("error", (e) => {
        console.error(e.message);
    })
}