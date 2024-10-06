import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";
import 'dotenv/config'

const { Pool, Client } = pg;
const app = express();
const port = process.env.PORT;

let bookInfo = [];
let sort = 'ASC';
let order = 'content.book_id';
const getBookUrl = process.env.GETURL;

const db = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE
  });

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

async function getBook() {
    const result = await db.query(`SELECT * FROM book_name INNER JOIN content ON book_name.id = content.book_id ORDER BY ${order} ${sort}`);
    bookInfo = result.rows;

    return bookInfo;
}

app.get("/", async (req, res) => {
    try {
        await getBook();

        res.render("index.ejs", { book : bookInfo, sort : sort });
    } catch (err) {
        console.log(err);
    }
});

app.post("/searchBook", async (req, res) => {

    const getSearch = req.body.title;

    const config = { params: { q : getSearch} };

    try {
        const response = await axios.get(getBookUrl, config);

        const book = response.data.docs[0];
        const isbn = book.isbn[0];
        const getImgUrl = `${process.env.GETIMG}${isbn}-M.jpg`;

        try {
        const result = await db.query("INSERT INTO book_name (title, author, publish_year, isbn, img_url) VALUES($1, $2, $3, $4, $5) RETURNING *", 
            [book.title,  book.author_name[0], book.first_publish_year, book.isbn[0], getImgUrl]);

        const returnId = result.rows[0].id;

        await db.query("INSERT INTO content (book_id, edit_text, rating) VALUES($1, $2, $3)", 
            [returnId, 'Edit your content here.', 0]);

        res.redirect("/");
        
        } catch (err) {
        console.log(err);
        }

    } catch (err) {
        console.log(err);
    }
});

app.post("/editContent", async (req, res) => {

    const text = req.body.inputText;
    const star = req.body.star;
    const id = req.body.editId;

    try {
        await db.query("UPDATE content SET edit_text = $1, rating = $2 WHERE book_id = $3", 
            [text, star, id]);

        res.redirect("/");
    } catch (err) {
        console.log(err);
    }

});

app.post("/deleteBook", async (req, res) => {

    const deleteBook = req.body.delete;

    try {
        await db.query("DELETE FROM content WHERE book_id = $1", [deleteBook]);
        await db.query("DELETE FROM book_name WHERE id = $1", [deleteBook]);
        
        res.redirect("/");
    } catch (err) {
        console.log(err);
    }

});

app.post("/sort", async (req, res) => {

    if(req.body.sortAlphabetical) {
        sort = req.body.sortAlphabetical;
        order = 'book_name.title';
    }

    else if(req.body.sortRating) {
        sort = req.body.sortRating;
        order = 'content.rating';
    }

    else {
        sort = req.body.sortRecent;
        order = 'content.book_id';
    }

    try {
        res.redirect("/");
    } catch (err) {
        console.log(err);
    }

});


app.listen(port, () => {
    console.log(`App is running on port ${port}.`);
});