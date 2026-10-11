(function () {

    const DEFAULT_CONFIG = {
        warningThreshold: 1000,
        criticalThreshold: 2000,
        regressionPercent: 20
    };

    function check(previousTime, currentTime, config = DEFAULT_CONFIG) {

        previousTime = Number(previousTime || 0);
        currentTime = Number(currentTime || 0);

        if (!currentTime) {
            return {
                issue: false,
                type: "NONE"
            };
        }

        if (currentTime >= config.criticalThreshold) {

            return {
                issue: true,
                type: "CRITICAL",
                previous: previousTime,
                current: currentTime,
                increasePercent: calculateIncrease(
                    previousTime,
                    currentTime
                )
            };
        }

        if (
            previousTime > 0 &&
            currentTime >
            previousTime * (1 + config.regressionPercent / 100)
        ) {

            return {
                issue: true,
                type: "REGRESSION",
                previous: previousTime,
                current: currentTime,
                increasePercent: calculateIncrease(
                    previousTime,
                    currentTime
                )
            };
        }

        if (currentTime >= config.warningThreshold) {

            return {
                issue: true,
                type: "WARNING",
                previous: previousTime,
                current: currentTime,
                increasePercent: calculateIncrease(
                    previousTime,
                    currentTime
                )
            };
        }

        return {
            issue: false,
            type: "NONE",
            previous: previousTime,
            current: currentTime,
            increasePercent: calculateIncrease(
                previousTime,
                currentTime
            )
        };
    }

    function calculateIncrease(previous, current) {

        if (!previous) {
            return 0;
        }

        return Number(
            (((current - previous) / previous) * 100).toFixed(2)
        );
    }

    window.APISentinelPerformance = {
        check,
        calculateIncrease,
        DEFAULT_CONFIG
    };

})();