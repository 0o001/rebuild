/*
Copyright (c) REBUILD <https://getrebuild.com/> and/or its owners. All rights reserved.

rebuild is dual-licensed under commercial and open source licenses (GPLv3).
See LICENSE and COMMERCIAL in the project root for license information.
*/

package com.rebuild.utils;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.Locale;

import static org.junit.jupiter.api.Assertions.*;

class HttpUtilsTest {

    @Test
    void get() throws Exception {
        System.out.println(HttpUtils.get("http://webhook.site/87ae9186-809e-4d65-a8af-346d0c07e46a"));
        System.out.println(HttpUtils.post("http://webhook.site/87ae9186-809e-4d65-a8af-346d0c07e46a", null));
    }
}