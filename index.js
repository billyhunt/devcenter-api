const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const graphql = require("graphql");
const ExpressGraphQL = require("express-graphql");
const cors = require("cors");

const app = express();
const database = new sqlite3.Database("./my.db");

const createArticleTable = () => {
  const query = `
      CREATE TABLE IF NOT EXISTS articles (
      id integer PRIMARY KEY,
      title text,
      content text)`;
  return database.run(query);
};
createArticleTable();

const ArticleType = new graphql.GraphQLObjectType({
  name: "Article",
  fields: {
    id: { type: graphql.GraphQLID },
    title: { type: graphql.GraphQLString },
    content: { type: graphql.GraphQLString },
  },
});

var queryType = new graphql.GraphQLObjectType({
  name: "Query",
  fields: {
    articles: {
      type: graphql.GraphQLList(ArticleType),
      resolve: (root, args, context, info) => {
        return new Promise((resolve, reject) => {
          database.all("SELECT * FROM articles;", function (err, rows) {
            if (err) {
              reject([]);
            }
            resolve(rows);
          });
        });
      },
    },
    article: {
      type: ArticleType,
      args: {
        id: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLID),
        },
      },
      resolve: (root, { id }, context, info) => {
        return new Promise((resolve, reject) => {
          database.all(
            "SELECT * FROM articles WHERE id = (?);",
            [id],
            function (err, rows) {
              if (err) {
                reject(null);
              }
              resolve(rows[0]);
            }
          );
        });
      },
    },
  },
});

var mutationType = new graphql.GraphQLObjectType({
  name: "Mutation",
  fields: {
    createArticle: {
      type: ArticleType,
      args: {
        title: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString),
        },
        content: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString),
        },
      },
      resolve: (root, { title, content }) => {
        return new Promise((resolve, reject) => {
          database.run(
            "INSERT INTO articles (title, content) VALUES (?,?);",
            [title, content],
            (err) => {
              if (err) {
                reject(null);
              }
              database.get("SELECT last_insert_rowid() as id", (err, row) => {
                resolve({
                  id: row["id"],
                  title: title,
                  content: content,
                });
              });
            }
          );
        });
      },
    },
    updateArticle: {
      type: graphql.GraphQLString,
      args: {
        id: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLID),
        },
        title: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString),
        },
        content: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString),
        },
      },

      resolve: (root, { id, title, content }) => {
        return new Promise((resolve, reject) => {
          database.run(
            "UPDATE articles SET title = (?), content = (?) WHERE id = (?);",
            [title, content, id],
            (err) => {
              if (err) {
                reject(err);
              }
              resolve(`Article #${id} updated`);
            }
          );
        });
      },
    },
    deleteArticle: {
      type: graphql.GraphQLString,
      args: {
        id: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLID),
        },
      },
      resolve: (root, { id }) => {
        return new Promise((resolve, reject) => {
          database.run("DELETE from articles WHERE id =(?);", [id], (err) => {
            if (err) {
              reject(err);
            }
            resolve(`Article #${id} deleted`);
          });
        });
      },
    },
  },
});

const schema = new graphql.GraphQLSchema({
  query: queryType,
  mutation: mutationType,
});

app.use(cors());
app.use("/graphql", ExpressGraphQL({ schema: schema, graphiql: true }));
app.listen(4001, () => {
  console.log("GraphQL server running at http://localhost:4001.");
});
