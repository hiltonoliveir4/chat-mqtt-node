const mqtt = require("mqtt");

const pub = mqtt.connect("mqtt://test.mosquitto.org");

const readline = require("readline");

class Publisher {
  constructor(pub) {
    this.pub = pub;
    this.meunome = "";
    this.minhaRole = "user";
    this.salaAtual = undefined;
  }

  start() {
    this.pub.on("connect", () => {
      // Escutando na "rota" msg_to_client
      this.pub.subscribe("msg_to_client");
      // Escutando a "rota" cmd_to_client
      this.pub.subscribe("system_to_client");
    });

    this.pub.on("message", (topic, message) => {
      var msgJson = JSON.parse(message);
      if (topic == "msg_to_client") {
        // Nao envia msg pra si mesmo
        if (
          msgJson.username != this.meunome &&
          msgJson.currentRoom == this.salaAtual
        ) {
          console.log(`${msgJson.username} - ${msgJson.message}`);
        }
      }

      if (topic == "system_to_client") {
        if (msgJson.user == this.meunome) {
          console.log(`SISTEMA - ${msgJson.msg}`);
        }

        if (msgJson.removeduser !== undefined) {
          if (msgJson.removeduser == this.meunome) {
            this.salaAtual = undefined;
            console.log(
              `SISTEMA - Você foi removido da sala e voltou ao chat geral`
            );
          }
        }
      }
    });
  }

  command(text_command) {
    var splitedCommand = text_command.split(" ");

    if (splitedCommand[0] == "/createroom") {
      pub.publish(
        "cmd",
        JSON.stringify({
          user: this.meunome,
          command: splitedCommand[0],
          param: splitedCommand[1],
          role: this.minhaRole,
        })
      );
    } else if (splitedCommand[0] == "/joinroom") {
      pub.publish(
        "cmd",
        JSON.stringify({
          user: this.meunome,
          command: splitedCommand[0],
          param: [splitedCommand[1], this.salaAtual],
          role: this.minhaRole,
        })
      );

      this.salaAtual = splitedCommand[1];
    } else if (splitedCommand[0] == "/kick") {
      pub.publish(
        "cmd",
        JSON.stringify({
          user: this.meunome,
          command: splitedCommand[0],
          param: [splitedCommand[1], splitedCommand[2]],
          role: this.minhaRole,
        })
      );
    } else if (splitedCommand[0] == "/ban") {
      pub.publish(
        "cmd",
        JSON.stringify({
          user: this.meunome,
          command: splitedCommand[0],
          param: [splitedCommand[1], splitedCommand[2]],
          role: this.minhaRole,
        })
      );
    } else if (splitedCommand[0] == "/rooms") {
      pub.publish(
        "cmd",
        JSON.stringify({
          user: this.meunome,
          command: splitedCommand[0],
          param: "",
          role: this.minhaRole,
        })
      );
    } else if (splitedCommand[0] == "/help") {
      pub.publish(
        "cmd",
        JSON.stringify({
          user: this.meunome,
          command: splitedCommand[0],
          param: "",
          role: this.minhaRole,
        })
      );
    }
  }

  create(text_create) {
    var splitedCommand = text_create.split(" ");
    const randomNumber = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
    this.meunome = splitedCommand[1] + randomNumber;
    console.log("Usuário cadastrado, seja bem vindo " + this.meunome);
  }

  admin() {
    this.minhaRole = "admin";
    console.log("SISTEMA - Promovido para admin");
  }

  mensagem(text_menssage) {
    if (this.meunome == "") {
      console.log(
        "SISTEMA - Cadastre-se para iniciar uma conversa, utilize o comando !meunome seunome"
      );
    } else {
      pub.publish(
        "msg",
        JSON.stringify({
          username: this.meunome,
          message: text_menssage,
          role: this.minhaRole,
          currentRoom: this.salaAtual,
        })
      );
    }
  }
}

publisher = new Publisher(pub);
publisher.start();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

var recursiveAsyncReadLine = () => {
  rl.question("", function (text) {
    if (text[0] == "/") {
      //comando
      publisher.command(text);
    } else if (text[0] == "!") {
      //cadastro
      publisher.create(text);
    } else if (text[0] == "#" && publisher.meunome !== "") {
      //admin
      publisher.admin();
    } else {
      //mensagem
      publisher.mensagem(text);
    }

    recursiveAsyncReadLine();
  });
};

recursiveAsyncReadLine();
