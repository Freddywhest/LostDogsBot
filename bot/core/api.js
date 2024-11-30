const app = require("../config/app");
const logger = require("../utils/logger");
const sleep = require("../utils/sleep");
var _ = require("lodash");

class ApiRequest {
  constructor(session_name, bot_name) {
    this.session_name = session_name;
    this.bot_name = bot_name;
  }

  async get_user_data(http_client) {
    try {
      const response = await http_client.get(
        `${app.apiUrl}?operationName=getHomePage&variables=%7B%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22b8533aa38c500ac8bc980bc9f9cf22ed2a8854df716a748f1a4c561598acc4ca%22%7D%7D`
      );

      if (_.isEmpty(response?.data?.data)) {
        const error = response?.data?.errors[0]?.message;
        if (error?.toLowerCase()?.includes("user not found")) {
          const register_data = await this.#register(http_client);
          if (!_.isEmpty(register_data)) {
            logger.info(
              `<ye>[${this.bot_name}]</ye> | ${this.session_name} | User ${register_data?.nickname} successfully registered! | User Id: ${register_data?.id}`
            );
            await this.get_user_data(http_client);
          }
        } else {
          logger.error(
            `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error in response from server: ${error}`
          );
        }
      }
      const json_data = [
        {
          launch: true,
          timeMs: Date.now(),
        },
      ];
      await this.save_game_event(http_client, json_data, "Launch");
      return response?.data?.data;
    } catch (error) {
      if (error?.response?.status > 499) {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Server Error while <b>getting user data:</b>: ${error.message}`
        );
        return null;
      }

      if (error?.response?.data?.message) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>getting user data:</b> ${error?.response?.data?.message}`
        );
        return null;
      }

      logger.error(
        `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>getting user data:</b>: ${error.message}`
      );
      return null;
    }
  }

  async get_common_tasks(http_client) {
    try {
      const response = await http_client.get(
        `${app.apiUrl}?operationName=getCommonTasks&variables=%7B%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%2242a3feca70931a1379e281f50da56eb6ca09f90ca5540a551425091bba106e83%22%7D%7D`
      );
      return response?.data?.data?.lostDogsWayCommonTasks?.items;
    } catch (error) {
      logger.error(
        `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>getting common tasks:</b>: ${error.message}`
      );
      return null;
    }
  }

  async get_done_common_tasks(http_client) {
    try {
      const response = await http_client.get(
        `${app.apiUrl}?operationName=lostDogsWayUserCommonTasksDone&variables=%7B%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22d731fbc9cb7638793fbbd157078074a1a1cc45cdb72ba3e00c1defc621f7d411%22%7D%7D`
      );
      return response?.data?.data?.lostDogsWayMovieUserCommonTasksDone;
    } catch (error) {
      logger.error(
        `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>getting common tasks:</b>: ${error.message}`
      );
      return null;
    }
  }

  async perform_common_task(http_client, task_id) {
    try {
      const data = {
        operationName: "lostDogsWayCompleteCommonTask",
        variables: {
          id: task_id,
        },
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash:
              "b0b06f8d88d1ebf3d8d8a4ac9281682adf955bcc185427ea9595fd8b568bacb0",
          },
        },
      };
      const response = await http_client.post(
        `${app.apiUrl}`,
        JSON.stringify(data)
      );

      /* const event_data = [
        {
          timeMs: Date.now(),
          yourDogGetFreeDogs: true,
        },
      ];

      await this.save_game_event(http_client, event_data, "Complete Task"); */

      if (
        _.isEmpty(response?.data?.data) &&
        !_.isEmpty(response?.data?.errors)
      ) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ${response?.data?.errors[0]?.message} <la>[${task_id}]</la>`
        );
        return null;
      }
      return response.data?.data?.lostDogsWayMovieCompleteCommonTask;
    } catch (error) {
      logger.error(
        `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>performing common task:</b> ${error.message}`
      );
      return null;
    }
  }

  async perform_ads_gram(http_client, task_id) {
    try {
      const data = {
        operationName: "lostDogsWayApplyAdsGram",
        variables: {
          taskId: task_id,
        },
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash:
              "6642132a95c3503b916158aecd45dacb48e306e7d9299f4c3eafd3121afc081b",
          },
        },
      };
      const response = await http_client.post(
        `${app.apiUrl}`,
        JSON.stringify(data)
      );

      if (
        _.isEmpty(response?.data?.data) &&
        !_.isEmpty(response?.data?.errors)
      ) {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ${response?.data?.errors[0]?.message} <la>[${task_id}]</la>`
        );
        return null;
      }
      return response.data?.data?.lostDogsWayApplyAdsGram;
    } catch (error) {
      logger.error(
        `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>performing ads gram:</b> ${error.message}`
      );
      return null;
    }
  }

  async vote(http_client, card) {
    try {
      const event_data = [
        {
          confirmChoice: {
            screen: "Home",
          },
          timeMs: Date.now(),
        },
        {
          payForCard: {
            screen: "SelectAmount",
          },
          timeMs: Date.now(),
        },
      ];

      await this.save_game_event(http_client, event_data, "MainScreen Vote");
      await sleep(_.random(2, 4));
      const data = {
        operationName: "lostDogsWayVote",
        variables: {
          value: String(card),
        },
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash:
              "e0871ed2837432448975c7d535b989d285a0d203c99e86dbec8d903df60a2f32",
          },
        },
      };
      const response = await http_client.post(
        `${app.apiUrl}`,
        JSON.stringify(data)
      );

      return response.data?.data?.lostDogsWayVote;
    } catch (error) {
      logger.error(
        `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>voting:</b> ${error.message}`
      );
      return null;
    }
  }

  //TODO:
  async view_prev_votes(http_client) {
    try {
      const data = {
        operationName: "lostDogsWayViewPrevRound",
        variables: {},
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash:
              "9d71c4ff04d1f8ec24f23decd0506e7b1b8a0c70ea6bb4c98fcaf6904eb96c35",
          },
        },
      };
      const response = await http_client.post(
        `${app.apiUrl}`,
        JSON.stringify(data)
      );
      return response.data?.data?.lostDogsWayCompleteTask;
    } catch (error) {
      logger.error(
        `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>verifying previous votes:</b> ${error.message}`
      );
      return null;
    }
  }

  async #register(http_client) {
    try {
      const data = {
        operationName: "lostDogsWayGenerateWallet",
        variables: {},
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash:
              "d78ea322cda129ec3958fe21013f35ab630830479ea9510549963956127a44dd",
          },
        },
      };
      const response = await http_client.post(
        `${app.apiUrl}`,
        JSON.stringify(data)
      );
      return response?.data?.data?.lostDogsWayGenerateWallet?.user;
    } catch (error) {
      if (error?.response?.data) {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b> registering a user:</b> ${error?.response?.data?.message}`
        );
      } else {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b> registering a user:</b> ${error.message}`
        );
      }
      return null;
    }
  }

  async save_game_event(http_client, data, event_name) {
    try {
      const json = {
        operationName: "lostDogsWaySaveEvent",
        variables: {
          data: {
            events: data,
            utm: {
              campaign: null,
              content: null,
              medium: null,
              source: null,
              term: null,
            },
          },
        },
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash:
              "08bf5c27603fce73333f322d205ed3648f7056be326c52610eb51f7f5a693d0f",
          },
        },
      };
      const response = await http_client.post(
        `${app.apiUrl}`,
        JSON.stringify(json)
      );

      if (response?.data?.data?.lostDogsWayMovieSaveEvent == true) {
        logger.info(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Game event <la>${event_name}</la> saved successfully`
        );
      } else {
        logger.warning(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} |  Failed to save game event: <la>${event_name}</la>`
        );
      }
    } catch (error) {
      if (error?.response?.data) {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>saving game event:</b> ${error?.response?.data?.message}`
        );
      } else {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error while <b>saving game event:</b> ${error.message}`
        );
      }
      return null;
    }
  }
}

module.exports = ApiRequest;
