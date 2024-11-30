const { default: axios } = require("axios");
const logger = require("../utils/logger");
const headers = require("./header");
const { SocksProxyAgent } = require("socks-proxy-agent");
const settings = require("../config/config");
const app = require("../config/app");
const user_agents = require("../config/userAgents");
const fs = require("fs");
const sleep = require("../utils/sleep");
const ApiRequest = require("./api");
var _ = require("lodash");
const path = require("path");
const moment = require("moment");
const _isArray = require("../utils/_isArray");

class NonSessionTapper {
  constructor(query_id, query_name) {
    this.bot_name = "lostdogs";
    this.session_name = query_name;
    this.query_id = query_id;
    this.API_URL = app.apiUrl;
    this.session_user_agents = this.#load_session_data();
    this.headers = { ...headers, "user-agent": this.#get_user_agent() };
    this.api = new ApiRequest(this.session_name, this.bot_name);
  }

  #load_session_data() {
    try {
      const filePath = path.join(process.cwd(), "session_user_agents.json");
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      if (error.code === "ENOENT") {
        return {};
      } else {
        throw error;
      }
    }
  }

  #get_random_user_agent() {
    const randomIndex = Math.floor(Math.random() * user_agents.length);
    return user_agents[randomIndex];
  }

  #get_user_agent() {
    if (this.session_user_agents[this.session_name]) {
      return this.session_user_agents[this.session_name];
    }

    logger.info(
      `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Generating new user agent...`
    );
    const newUserAgent = this.#get_random_user_agent();
    this.session_user_agents[this.session_name] = newUserAgent;
    this.#save_session_data(this.session_user_agents);
    return newUserAgent;
  }

  #save_session_data(session_user_agents) {
    const filePath = path.join(process.cwd(), "session_user_agents.json");
    fs.writeFileSync(filePath, JSON.stringify(session_user_agents, null, 2));
  }

  #proxy_agent(proxy) {
    try {
      if (!proxy) return null;
      let proxy_url;
      if (!proxy.password && !proxy.username) {
        proxy_url = `socks${proxy.socksType}://${proxy.ip}:${proxy.port}`;
      } else {
        proxy_url = `socks${proxy.socksType}://${proxy.username}:${proxy.password}@${proxy.ip}:${proxy.port}`;
      }
      return new SocksProxyAgent(proxy_url);
    } catch (e) {
      logger.error(
        `<ye>[${this.bot_name}]</ye> | ${
          this.session_name
        } | Proxy agent error: ${e}\nProxy: ${JSON.stringify(proxy, null, 2)}`
      );
      return null;
    }
  }

  async #get_tg_web_data() {
    try {
      return this.query_id;
    } catch (error) {
      logger.error(
        `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ❗️Unknown error during Authorization: ${error}`
      );
      throw error;
    } finally {
      await sleep(1);
      logger.info(
        `<ye>[${this.bot_name}]</ye> | ${this.session_name} | 🚀 Starting session...`
      );
    }
  }

  async #check_proxy(http_client, proxy) {
    try {
      const response = await http_client.get("https://httpbin.org/ip");
      const ip = response.data.origin;
      logger.info(
        `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Proxy IP: ${ip}`
      );
    } catch (error) {
      if (
        error.message.includes("ENOTFOUND") ||
        error.message.includes("getaddrinfo") ||
        error.message.includes("ECONNREFUSED")
      ) {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Error: Unable to resolve the proxy address. The proxy server at ${proxy.ip}:${proxy.port} could not be found. Please check the proxy address and your network connection.`
        );
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | No proxy will be used.`
        );
      } else {
        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Proxy: ${proxy.ip}:${proxy.port} | Error: ${error.message}`
        );
      }

      return false;
    }
  }

  async run(proxy) {
    let http_client;
    let access_token_created_time = 0;

    let profile_data;
    let bones_balance;
    let woof_balance;
    let prev_round_data;

    if (settings.USE_PROXY_FROM_FILE && proxy) {
      http_client = axios.create({
        httpsAgent: this.#proxy_agent(proxy),
        headers: this.headers,
        withCredentials: true,
      });
      const proxy_result = await this.#check_proxy(http_client, proxy);
      if (!proxy_result) {
        http_client = axios.create({
          headers: this.headers,
          withCredentials: true,
        });
      }
    } else {
      http_client = axios.create({
        headers: this.headers,
        withCredentials: true,
      });
    }
    while (true) {
      try {
        const currentTime = Date.now() / 1000;
        if (currentTime - access_token_created_time >= 3600) {
          const tg_web_data = await this.#get_tg_web_data();
          if (
            _.isNull(tg_web_data) ||
            _.isUndefined(tg_web_data) ||
            !tg_web_data ||
            _.isEmpty(tg_web_data)
          ) {
            continue;
          }

          http_client.defaults.headers["x-auth-token"] = `${tg_web_data}`;
          access_token_created_time = currentTime;
          await sleep(2);
        }

        profile_data = await this.api.get_user_data(http_client);
        if (_.isEmpty(profile_data)) {
          continue;
        }
        woof_balance = _.floor(
          parseInt(profile_data?.lostDogsWayMovieUserInfo?.woofBalance) /
            1000000000
        );
        logger.info(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | 🐶 Woof balance: <gr>${woof_balance} $WOOF</gr>`
        );
        prev_round_data = profile_data?.lostDogsWayMovieUserInfo?.prevRoundVote;

        if (!_.isEmpty(prev_round_data)) {
          logger.info(
            `<ye>[${this.bot_name}]</ye> | ${this.session_name} | 🐶 Previous round is over | Getting prediction rewards...`
          );
          const price = parseInt(prev_round_data?.woofPrize) / 1000000000;
          if (prev_round_data?.userStatus?.toLowerCase() === "winner") {
            const notcoin = parseInt(prev_round_data?.notPrize) / 1000000000;
            logger.info(
              `<ye>[${this.bot_name}]</ye> | ${this.session_name} | 🎉 Congratulations! You won <gr>${price} $WOOF</gr> and <gr>${notcoin} $NOT</gr>!`
            );
          } else if (prev_round_data?.userStatus?.toLowerCase() === "loser") {
            logger.info(
              `<ye>[${this.bot_name}]</ye> | ${this.session_name} | 😢 You lost but you got <gr>${price} $WOOF</gr>`
            );
          }

          /*  await this.api.view_prev_votes(http_client); */
        }

        await sleep(5);

        const current_round =
          profile_data?.lostDogsWayMovieUserInfo?.currentRoundVote;

        if (_.isEmpty(current_round)) {
          let card;
          if (settings.CHOOSE_RANDOM_CARDS) {
            card = _.random(1, 3);
          } else {
            card = settings.CARD_TO_CHOOSE;
          }

          const vote_result = await this.api.vote(http_client, card);

          if (!_.isEmpty(vote_result)) {
            logger.info(
              `<ye>[${this.bot_name}]</ye> | ${this.session_name} | 🐶 Voted for card <bl>${vote_result?.selectedRoundCardValue}</bl>`
            );
          }
        } else {
          logger.info(
            `<ye>[${this.bot_name}]</ye> | ${this.session_name} | 🐶 Voted card: <pi>${current_round?.selectedRoundCardValue}</pi>`
          );
        }
        await sleep(5);

        if (settings.AUTO_CLAIM_TASKS) {
          const get_common_tasks = await this.api.get_common_tasks(http_client);
          const get_done_common_tasks = await this.api.get_done_common_tasks(
            http_client
          );
          const undone_tasks = get_common_tasks?.filter(
            (task) =>
              !get_done_common_tasks?.includes(task?.id) &&
              task?.customCheckStrategy == null
          );

          const adsGram = get_common_tasks?.filter(
            (task) =>
              !get_done_common_tasks?.includes(task?.id) &&
              task?.customCheckStrategy == "adsGram"
          );

          if (!_.isEmpty(adsGram)) {
            let ad_count = 0;
            while (ad_count < 3) {
              const sleep_time = _.random(15, 20);
              logger.info(
                `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Sleeping ${sleep_time} seconds to claim: <bl>Ads Gram</bl>`
              );
              await sleep(sleep_time);

              const adsData = adsGram[0];
              const task_id = adsData?.id;
              const common_tasks_claim = await this.api.perform_ads_gram(
                http_client,
                task_id
              );
              if (
                !_.isEmpty(common_tasks_claim) &&
                common_tasks_claim?.success
              ) {
                logger.info(
                  `<ye>[${this.bot_name}]</ye> | ${
                    this.session_name
                  } | Claimed task: <bl>Ads Gram</bl> | Reward: <gr>${
                    !isNaN(parseInt(common_tasks_claim?.task?.woofReward))
                      ? parseInt(common_tasks_claim?.task?.woofReward) /
                          1000000000 +
                        " $WOOF"
                      : "N/A"
                  }</gr>`
                );
                if (!common_tasks_claim?.watchMore) {
                  break;
                }
              } else {
                logger.warning(
                  `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Failed to claim task: <bl>${task?.name}</bl>`
                );
                break;
              }
              ad_count++;
            }
          }

          if (!_.isEmpty(undone_tasks)) {
            for (const task of undone_tasks) {
              const sleep_time = _.random(10, 15);
              logger.info(
                `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Sleeping ${sleep_time} seconds to claim: <bl>${task?.name}</bl>`
              );
              await sleep(sleep_time);
              const task_id = task?.id;
              const common_tasks_claim = await this.api.perform_common_task(
                http_client,
                task_id
              );
              if (
                !_.isEmpty(common_tasks_claim) &&
                common_tasks_claim?.success
              ) {
                logger.info(
                  `<ye>[${this.bot_name}]</ye> | ${
                    this.session_name
                  } | Claimed task: <bl>${task?.name}</bl> | Reward: <gr>${
                    !isNaN(parseInt(common_tasks_claim?.task?.woofReward))
                      ? parseInt(common_tasks_claim?.task?.woofReward) /
                          1000000000 +
                        " $WOOF"
                      : "N/A"
                  }</gr>`
                );
              } else {
                logger.warning(
                  `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Failed to claim task: <bl>${task?.name}</bl>`
                );
              }
            }
          }
        }

        await sleep(5);

        const round_ends = isNaN(
          parseInt(
            profile_data?.lostDogsWayMovieGameStatus?.gameState?.roundEndsAt
          )
        )
          ? 0
          : parseInt(
              profile_data?.lostDogsWayMovieGameStatus?.gameState?.roundEndsAt
            );

        const game_ends = isNaN(
          parseInt(
            profile_data?.lostDogsWayMovieGameStatus?.gameState?.gameEndsAt
          )
        )
          ? 0
          : parseInt(
              profile_data?.lostDogsWayMovieGameStatus?.gameState?.gameEndsAt
            );
        logger.info(
          `<ye>[${this.bot_name}]</ye> | ${
            this.session_name
          } |  Current round ends <lb>${moment(
            new Date(round_ends * 1000)
          ).fromNow()}</lb> | Game ends: <lb>${moment(
            new Date(game_ends * 1000)
          ).fromNow()}</lb>`
        );
      } catch (error) {
        console.log(error);

        logger.error(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | ❗️Unknown error: ${error}`
        );
      } finally {
        let ran_sleep;
        if (_isArray(settings.SLEEP_BETWEEN_REQUESTS)) {
          if (
            _.isInteger(settings.SLEEP_BETWEEN_REQUESTS[0]) &&
            _.isInteger(settings.SLEEP_BETWEEN_REQUESTS[1])
          ) {
            ran_sleep = _.random(
              settings.SLEEP_BETWEEN_REQUESTS[0],
              settings.SLEEP_BETWEEN_REQUESTS[1]
            );
          } else {
            ran_sleep = _.random(450, 800);
          }
        } else if (_.isInteger(settings.SLEEP_BETWEEN_REQUESTS)) {
          const ran_add = _.random(20, 50);
          ran_sleep = settings.SLEEP_BETWEEN_REQUESTS + ran_add;
        } else {
          ran_sleep = _.random(450, 800);
        }

        logger.info(
          `<ye>[${this.bot_name}]</ye> | ${this.session_name} | Sleeping for ${ran_sleep} seconds...`
        );
        await sleep(ran_sleep);
      }
    }
  }
}
module.exports = NonSessionTapper;
