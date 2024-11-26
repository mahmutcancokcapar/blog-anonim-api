const express = require("express");
const rethinkdb = require("rethinkdb");
const cors = require("cors");

const app = express();
const port = 5000;

app.use(cors()); // CORS ile React ile iletişim sağlıyoruz
app.use(express.json()); // JSON verilerini parse etmek için

// RethinkDB bağlantısı
let connection = null;
rethinkdb.connect({ host: "localhost", port: 28015 }, (err, conn) => {
	if (err) {
		console.error("RethinkDB bağlantı hatası:", err);
		process.exit(1);
	}
	connection = conn;
	console.log("RethinkDB'e bağlanıldı!");
});

// Veritabanı ve tablo oluşturulması
rethinkdb.dbList().run(connection, (err, result) => {
	if (err) throw err;
	if (!result.includes("blog")) {
		rethinkdb.dbCreate("blog").run(connection);
	}
	rethinkdb
		.db("blog")
		.tableList()
		.run(connection, (err, tables) => {
			if (err) throw err;
			if (!tables.includes("posts")) {
				rethinkdb.db("blog").tableCreate("posts").run(connection);
			}
		});
});

// Yeni gönderi eklemek için API endpoint'i
app.post("/api/posts", (req, res) => {
	const { content } = req.body;
	if (!content) {
		return res.status(400).json({ error: "Gönderi içeriği boş olamaz" });
	}

	rethinkdb
		.db("blog")
		.table("posts")
		.insert({ content })
		.run(connection, (err, result) => {
			if (err) {
				return res.status(500).json({ error: "Veritabanı hatası" });
			}
			res.status(201).json({ id: result.generated_keys[0], content });
		});
});

// Gönderileri almak için API endpoint'i
app.get("/api/posts", (req, res) => {
	rethinkdb
		.db("blog")
		.table("posts")
		.run(connection, (err, cursor) => {
			if (err) {
				return res.status(500).json({ error: "Veritabanı hatası" });
			}
			cursor.toArray((err, posts) => {
				if (err) {
					return res.status(500).json({ error: "Veritabanı hatası" });
				}
				res.json(posts);
			});
		});
});

// Sunucuyu başlatma
app.listen(port, () => {
	console.log(`Sunucu ${port} portunda çalışıyor`);
});
