"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
const node_https_1 = __importDefault(require("node:https"));
const node_fs_1 = __importDefault(require("node:fs"));
const jsdom_1 = require("jsdom");
const courseListUrl = "https://www.sis.itu.edu.tr/EN/student/undergraduate/course-plans/plans/BLGE/201810.html";
const courseListFilename = "CourseList.html";
function GetCourseCodes(document) {
    const elements = document.querySelectorAll('a[title="Click For Course Catalogue Form."]');
    const result = [];
    elements.forEach((element) => {
        const text = element.innerHTML;
        const regex = /\s+/;
        const splits = text.split(regex);
        result.push({ code: splits[0], number: splits[1] });
    });
    return result;
}
function GetCourseList(data) {
    const jsdom = new jsdom_1.JSDOM(data, { url: courseListUrl });
    const courseCodes = GetCourseCodes(jsdom.window.document);
    courseCodes.forEach((course) => {
        console.log(JSON.stringify(course));
    });
}
if (node_fs_1.default.existsSync(courseListFilename)) {
    console.log("Reading from cache: " + courseListFilename);
    const data = node_fs_1.default.readFileSync(courseListFilename).toString();
    GetCourseList(data);
}
else {
    console.log("No cache found! Downloading...");
    node_https_1.default.get(courseListUrl, (response) => {
        console.log("Got response: ", response.statusCode);
        let data = "";
        response.on("data", (chunk) => { data += chunk; });
        response.on("end", () => {
            console.log("Writing cache: " + courseListFilename);
            node_fs_1.default.writeFileSync(courseListFilename, data);
            GetCourseList(data);
        });
    }).on("error", (e) => {
        console.error(e.message);
    });
}
