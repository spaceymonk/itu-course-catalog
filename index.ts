process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

import fs from "node:fs";
import { JSDOM } from "jsdom";
import { URLSearchParams } from "node:url";

type Course = {
    subj: string;
    numb: string;
}

const courseListUrl = "https://www.sis.itu.edu.tr/EN/student/undergraduate/course-plans/plans/BLGE/201810.html";
const courseListFilename = "CourseList.html";
const courseDetailsUrl = "https://www.sis.itu.edu.tr/EN/student/undergraduate/course-information/course-information.php";
const courseDetailsFilename = "CourseDetails.html";

function GetCourseCodes(document: Document): Course[] {
    const elements: NodeListOf<HTMLAnchorElement> = document.querySelectorAll('a[title="Click For Course Catalogue Form."]');
    const result: Course[] = [];
    const regex = /\s+/;
    elements.forEach((element) => {
        const splits = element.innerHTML.split(regex);
        result.push({ subj: splits[0], numb: splits[1] });
    });
    return result;
}

function GetCourseDetails(course: Course): Promise<string> {
    const body = new URLSearchParams(course);
    return new Promise((resolve, reject) => {
        fetch(courseDetailsUrl, { method: "POST", body })
            .then((res) => res.text())
            .then((text) => resolve(text))
            .catch(e => reject(e));
    })
}

async function GetCourseListHtml(text: string): Promise<string> {
    let payload = "";
    const courseCodes = GetCourseCodes(new JSDOM(text, { url: courseListUrl }).window.document);
    for (let index = 0; index < courseCodes.length; index++) {
        const course = courseCodes[index];
        console.log(`[${index + 1}/${courseCodes.length}] Processing ${course.subj} ${course.numb}`);

        console.log("    Downloading...");
        const courseDetail = await GetCourseDetails(course);
        console.log("    Extracting...");
        const jsdom = new JSDOM(courseDetail, { url: courseDetailsUrl });
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
    if (fs.existsSync(courseListFilename)) {
        console.log("Reading from cache: " + courseListFilename);
        const text = fs.readFileSync(courseListFilename).toString();
        const html = await GetCourseListHtml(text);
        fs.writeFileSync(courseDetailsFilename, html);
    } else {
        console.log("No cache found! Downloading...");
        fetch(courseListUrl)
            .then((res) => res.text())
            .then(async (text) => {
                console.log("Writing cache...");
                fs.writeFileSync(courseListFilename, text);
                const html = await GetCourseListHtml(text);
                fs.writeFileSync(courseDetailsFilename, html);
            })
            .catch((e) => { console.error(e.message); });
    }
}

main();