import {Api} from "@cennznet/api";

export const Singleton = (function () {
    let instance;

    async function createInstance() {
        const api = await Api.create({
            provider: process.env.provider
        });
        console.log('Creating new instance..');
        return api;
    }

    return {
        getInstance: function () {
            if (!instance) {
                instance = createInstance();
            }
            return instance;
        },
    };
})();

