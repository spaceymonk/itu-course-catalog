"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
const node_fs_1 = __importDefault(require("node:fs"));
const jsdom_1 = require("jsdom");
const node_url_1 = require("node:url");
const courseListUrl = "https://www.sis.itu.edu.tr/EN/student/undergraduate/course-plans/plans/BLGE/201810.html";
const courseListFilename = "CourseList.html";
const courseDetailsUrl = "https://www.sis.itu.edu.tr/EN/student/undergraduate/course-information/course-information.php";
const courseDetailsFilename = "CourseDetails.html";
function GetCourseCodes(document) {
    const elements = document.querySelectorAll('a[title="Click For Course Catalogue Form."]');
    const result = [];
    const regex = /\s+/;
    elements.forEach((element) => {
        const splits = element.innerHTML.split(regex);
        result.push({ subj: splits[0], numb: splits[1] });
    });
    return result;
}
function GetCourseDetails(course) {
    const body = new node_url_1.URLSearchParams(course);
    return new Promise((resolve, reject) => {
        fetch(courseDetailsUrl, { method: "POST", body })
            .then((res) => res.text())
            .then((text) => resolve(text))
            .catch(e => reject(e));
    });
}
async function GetCourseListHtml(text) {
    let payload = "";
    const courseCodes = GetCourseCodes(new jsdom_1.JSDOM(text, { url: courseListUrl }).window.document);
    for (let index = 0; index < courseCodes.length; index++) {
        const course = courseCodes[index];
        console.log(`[${index + 1}/${courseCodes.length}] Processing ${course.subj} ${course.numb}`);
        console.log("    Downloading...");
        const courseDetail = await GetCourseDetails(course);
        console.log("    Extracting...");
        const jsdom = new jsdom_1.JSDOM(courseDetail, { url: courseDetailsUrl });
        const detailsElem = jsdom.window.document.querySelector("body > div > div.main-container > div > div:nth-child(3)");
        if (detailsElem === null) {
            throw new Error("Details element is not present for: " + JSON.stringify(course));
        }
        console.log("    Saving...");
        payload += detailsElem.innerHTML;
    }
    return payload;
}
async function main() {
    if (node_fs_1.default.existsSync(courseListFilename)) {
        console.log("Reading from cache: " + courseListFilename);
        const text = node_fs_1.default.readFileSync(courseListFilename).toString();
        const html = await GetCourseListHtml(text);
        node_fs_1.default.writeFileSync(courseDetailsFilename, html);
    }
    else {
        console.log("No cache found! Downloading...");
        fetch(courseListUrl)
            .then((res) => res.text())
            .then(async (text) => {
            console.log("Writing cache...");
            node_fs_1.default.writeFileSync(courseListFilename, text);
            const html = await GetCourseListHtml(text);
            node_fs_1.default.writeFileSync(courseDetailsFilename, html);
        })
            .catch((e) => { console.error(e.message); });
    }
}
main();
