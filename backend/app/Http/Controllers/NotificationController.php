<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    public function index()
    {
        try {
            $notifications = Notification::where('user_id', Auth::id())
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'data' => $notifications
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching notifications: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت اعلان‌ها',
                'error' => $e->getMessage()
            ], 500);
        }
    }

   public function store(Request $request)
{
    try {
        $validated = $request->validate([
            'user_id'        => 'required|exists:users,id',
            'title'          => 'required|string|max:255',
            'message'        => 'required|string',
            'type'           => 'nullable|string|max:100',

            'reference_type' => 'nullable|string|max:100',
            'reference_id'   => 'nullable|integer',

            'priority'       => 'nullable|in:Low,Normal,High,Urgent',
            'action_url'     => 'nullable|string|max:255',
            'data'           => 'nullable|array',
            'expires_at'     => 'nullable|date',
        ]);

        $notification = Notification::create([
            'user_id'        => $validated['user_id'],
            'sender_id'      => Auth::id(),

            'title'          => $validated['title'],
            'message'        => $validated['message'],

            'type'           => $validated['type'] ?? 'general',

            'reference_type' => $validated['reference_type'] ?? null,
            'reference_id'   => $validated['reference_id'] ?? null,

            'priority'       => $validated['priority'] ?? 'Normal',
            'action_url'     => $validated['action_url'] ?? null,
            'data'           => $validated['data'] ?? null,
            'expires_at'     => $validated['expires_at'] ?? null,

            'is_read'        => false,
            'created_by'     => Auth::id(),
        ]);

        return response()->json([
            'message' => 'اعلان با موفقیت ارسال شد',
            'data'    => $notification
        ], 201);

    } catch (\Exception $e) {
        Log::error('Error creating notification: ' . $e->getMessage());

        return response()->json([
            'message' => 'خطا در ارسال اعلان',
            'error'   => $e->getMessage()
        ], 500);
    }
}

    public function update(Request $request, $id)
    {
        try {
            $notification = Notification::where('user_id', Auth::id())
                ->find($id);

            if (!$notification) {
                return response()->json([
                    'message' => 'اعلان مورد نظر یافت نشد'
                ], 404);
            }

            $validated = $request->validate([
                'is_read' => 'boolean',
            ]);

            $notification->update($validated);

            return response()->json([
                'message' => 'اعلان با موفقیت به‌روزرسانی شد',
                'data' => $notification
            ]);

        } catch (\Exception $e) {
            Log::error('Error updating notification: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در به‌روزرسانی اعلان',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $notification = Notification::where('user_id', Auth::id())
                ->find($id);

            if (!$notification) {
                return response()->json([
                    'message' => 'اعلان مورد نظر یافت نشد'
                ], 404);
            }

            $notification->delete();

            return response()->json([
                'message' => 'اعلان با موفقیت حذف شد'
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting notification: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در حذف اعلان',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}