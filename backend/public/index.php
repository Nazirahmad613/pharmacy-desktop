<?php

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

require __DIR__.'/../vendor/autoload.php'; // Autoload dependencies

$app = require_once __DIR__.'/../bootstrap/app.php'; // Bootstrap the application

$kernel = $app->make(Kernel::class); // Create the HTTP kernel

$request = Request::capture(); // Capture the incoming request

$response = $kernel->handle($request); // Handle the request and get a response

$response->send(); // Send the response back to the client

$kernel->terminate($request, $response); // Terminate the kernel