const mqtt = require("mqtt");

class SubController {
  constructor() {
    this.rooms = [];
  }

  // Cria uma nova sala
  createRoom(name_room) {
    this.rooms.push({
      idRoom: this.rooms.length + 1,
      nome: name_room,
      users: [],
      blackList: [],
    });
  }

  addUser(nome_usuario, nome_sala) {
    const sala = this.buscarSala(nome_sala);
    const found = sala.blackList.find(element => element == nome_usuario);
    if (sala !== undefined && found == undefined) {
      sala.users.push(nome_usuario);
      return true;
    }
    return false;
  }

  removeUserRoom(nome_usuario, nome_sala) {
    const sala = this.buscarSala(nome_sala);
    var response = false;

    if (sala !== undefined) {
      sala.users.map((item, index) => {
        if (item == nome_usuario) {
          sala.users.splice(index, 1);
          response = true;
        }
      });
    }

    return response;
  }

  banUser(nome_usuario, nome_sala){
    const sala = this.buscarSala(nome_sala);
    if (sala !== undefined) {
      sala.blackList.push(nome_usuario)
    }
  }

  buscarSala(nome_sala) {
    var sala = undefined;
    this.rooms.map((item) => {
      if (item.nome == nome_sala) {
        sala = item;
      }
    });
    return sala;
  }
}
// Instância do controller
sub = new SubController();

// Instancia do sub
subInstance = mqtt.connect("mqtt://test.mosquitto.org");

subInstance.on("connect", () => {
  subInstance.subscribe("msg");
  subInstance.subscribe("cmd");
});

subInstance.on("message", (topic, message) => {
  switch (topic) {
    case "msg":
      // Envia a mensagem de volta a todos os publishers (porem quem enviou nao recebe, vide o pub.js)
      subInstance.publish("msg_to_client", message);
      break;

    case "cmd":
      const payload = JSON.parse(message);

      if (payload.command == "/createroom") {
        // TODO: VERIFICAR SE EXISTE UM NOME PARA A SALA

        if (payload.role == "user") {
          payload.msg = "Apenas administradores podem criar salas";
          subInstance.publish("system_to_client", JSON.stringify(payload));
        } else if (sub.buscarSala(payload.param) == undefined) {
          sub.createRoom(payload.param);
          payload.msg = "Sala criada com sucesso!";
          subInstance.publish("system_to_client", JSON.stringify(payload));
        } else {
          payload.msg = `Já existe uma sala com o nome ${payload.param}!`;
          subInstance.publish("system_to_client", JSON.stringify(payload));
        }
      } else if (payload.command == "/joinroom") {
        if (sub.addUser(payload.user, payload.param[0])) {
          payload.msg = `Você entrou na sala ${payload.param[0]}!`;
          subInstance.publish("system_to_client", JSON.stringify(payload));

          if (payload.param[1] !== undefined) {
            response = sub.removeUserRoom(payload.user, payload.param[1]);
          }
        } else {
          payload.msg = `A sala não existe ou você foi banido!`;
          subInstance.publish("system_to_client", JSON.stringify(payload));
        }
      } else if (payload.command == "/kick") {
        if (payload.role == "admin") {
          if (sub.removeUserRoom(payload.param[0], payload.param[1])) {
            payload.msg = `Usuário removido com sucesso!`;
            payload.removeduser = payload.param[0];
          } else {
            payload.msg = `Usuário ou sala não encontrados! Verifique os dados e tente novamente!`;
          }
        } else {
          payload.msg = `Apenas administradores podem kickar usuários de salas`;
        }
        subInstance.publish("system_to_client", JSON.stringify(payload));
      } else if (payload.command == "/ban"){
        if (payload.role == "admin") {
          if (sub.removeUserRoom(payload.param[0], payload.param[1])) {
            sub.banUser(payload.param[0], payload.param[1]);
            payload.msg = `Usuário banido com sucesso!`;
            payload.removeduser = payload.param[0];
          } else {
            payload.msg = `Usuário ou sala não encontrados! Verifique os dados e tente novamente!`;
          }
        } else {
          payload.msg = `Apenas administradores podem banir usuários de salas`;
        }
        subInstance.publish("system_to_client", JSON.stringify(payload));
      }
      break;
    default:
      console.log("nada");
  }
});
