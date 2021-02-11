const express = require('express');
const mysql = require('mysql');
const app = express();

const bodyParser = require('body-parser');
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json

const PORT = process.env.PORT || 3050;

app.use(bodyParser.json());

let countOccurence = 0;

app.get('/', (req, res) => {
    res.send('Welcome to my API!');
});

app.post('/mutation', function (req, res) {
    let body = req.body;

    buildMatriz(body.dna)
        .then(matrix => {
            try {
                return checkMutation(matrix);
            } catch (err) {
                throw err;
            }
        })
        .then(countOccurence => {
            if (countOccurence >= 2) {
                registerDna(body.dna, 1)
                res.status(200).json({
                    message: "Yes mutation"
                })
            } else {
                registerDna(body.dna, 0)
                res.status(403).json({
                    message: "No mutation"
                })
            }
        })
        .catch(err => {
            res.status(400).json({
                message: err
            })
        })
})

app.get('/stats', function (req, res) {
    getStats()
        .then(response => {
            res.status(200).json({
                "count_mutations": response.count_mutations,
                "count_no_mutation": response.count_no_mutation,
                "ratio": response.ratio
            })
        })
        .catch(err => {
            res.status(400).json({
                message: err
            })
        })
})

//Chech mutation
async function checkMutation(matrix) {
    countOccurence = 0;
    try {
        horizontally(matrix);
        vertically(matrix);
        diagonally(matrix);
        invertedDiagonally(matrix);
        return countOccurence;
    } catch (err) {
        throw err;
    }
}

//Stats
async function getStats() {
    try {
        let count_mutations = await countDnaMutations();
        let count_no_mutation = await countDnaNotMutation();
        let ratio = 0;
        (count_mutations == 0 || count_no_mutation == 0) ? ratio = 0 : ratio = count_mutations / count_no_mutation;

        return { count_mutations: count_mutations, count_no_mutation: count_no_mutation, ratio: ratio }
    } catch (err) {
        throw err;
    }
}

// Horizontally
function horizontally(matrix) {
    for (let i = 0; i < matrix.length; i++) {
        let dna_string = '';
        for (let j = 0; j < matrix[i].length; j++) {
            dna_string = dna_string + matrix[i][j];
        }
        getOccurence(dna_string);
    }
}

//Vertically
function vertically(matrix) {
    for (let i = 0; i < matrix.length; i++) {
        let dna_string = '';
        for (let j = 0; j < matrix[i].length; j++) {
            dna_string = dna_string + matrix[j][i];
        }
        getOccurence(dna_string);
    }
}

//Diagonally
function diagonally(matrix) {
    let dna_string = '';
    j = 0;
    for (let i = 0; i < matrix.length; i++) {
        dna_string = dna_string + matrix[i][j]
        j++;
    }
    return getOccurence(dna_string);
}

//Inverted Diagonally
function invertedDiagonally(matrix) {
    let dna_string = '';
    j = matrix.length - 1;
    for (let i = 0; i < matrix.length; i++) {
        dna_string = dna_string + matrix[i][j]
        j--;
    }
    return getOccurence(dna_string);
}

//BuildMatrix
async function buildMatriz(dna) {
    try {
        let matrix = new Array(6).fill(0).map(() => new Array(6).fill(0));
        for (let i = 0; i < matrix.length; i++) {
            for (let j = 0; j < matrix[i].length; j++) {
                matrix[j][i] = Array.from(dna[j])[i];
            }
        }
        return matrix;
    }
    catch (err) {
        throw err;
    }
}

//Check Ocurrence
function getOccurence(dna_string) {
    let map = new Map([
        ["A", 0],
        ["T", 0],
        ["C", 0],
        ["G", 0],
    ])
    Array.from(dna_string).map(letter => {
        if (map.has(letter)) {
            map.set(letter, map.get(letter) + 1)
        }
    })

    if (map.get("A") >= 4 || map.get("T") >= 4 || map.get("C") >= 4 || map.get("G") >= 4) {
        countOccurence++;
    }
    return countOccurence
}

//Database cxn
const cxn = mysql.createConnection({
    host: "us-cdbr-east-03.cleardb.com",
    user: "bf059c4ff189de",
    password: "3a1dc71e",
    database: "heroku_4b0cdab7b25a90d"
});

cxn.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
});

//Register dna
function registerDna(dna, mutation) {
    let dna_string = '';
    dna.map(m => {
        dna_string = dna_string + m + '::';
    })

    var sql = "INSERT INTO dna (dna, mutation) VALUES ?";
    let values = [[dna_string, mutation]]
    cxn.query(sql, [values], function (err, result) {
        if (err) throw err;
        console.log("1 record inserted, ID: " + result.insertId);
    });
}

//Count Dna with Mutations
function countDnaMutations() {
    return new Promise((resolve, reject) => {
        let sql = "SELECT COUNT(mutation) AS dnaCount FROM dna WHERE mutation = 1";
        cxn.query(sql, function (err, result) {
            if (err) throw err;
            resolve(result[0].dnaCount);
        })
    })
}

//Count Dna without Mutations
function countDnaNotMutation() {
    return new Promise((resolve, reject) => {
        let sql = "SELECT COUNT(mutation) AS dnaCount FROM dna WHERE mutation = 0";
        cxn.query(sql, function (err, result) {
            if (err) throw err;
            resolve(result[0].dnaCount);
        })
    })
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));