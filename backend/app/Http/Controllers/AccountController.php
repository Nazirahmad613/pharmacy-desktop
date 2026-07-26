<?php

namespace App\Http\Controllers;

use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Services\LogService;

class AccountController extends Controller
{

    /**
     * لیست حسابات
     */
    public function index(Request $request)
    {
        $query = Account::query();


        if ($request->filled('account_type')) {

            $query->where(
                'account_type',
                $request->account_type
            );

        }


        if ($request->filled('status')) {

            $query->where(
                'status',
                $request->status
            );

        }


        if ($request->filled('search')) {

            $search = $request->search;


            $query->where(function($q) use ($search){

                $q->where(
                    'name',
                    'like',
                    "%{$search}%"
                )
                ->orWhere(
                    'account_code',
                    'like',
                    "%{$search}%"
                )
                ->orWhere(
                    'phone',
                    'like',
                    "%{$search}%"
                );

            });

        }


        return response()->json(
            $query
            ->orderBy('id','desc')
            ->get()
        );
    }




    /**
     * ثبت حساب جدید
     */
    public function store(Request $request)
    {

        $validated = $request->validate([


            'account_code'
                =>
            'required|string|max:30|unique:accounts,account_code',


            'account_type'
                =>
            'required|in:Supplier,Customer,Insurance,Company,NGO,Bank,Laboratory,Radiology,Donor,Other',


            'name'
                =>
            'required|string|max:255',


            'contact_person'
                =>
            'nullable|string|max:255',



            'phone'
                =>
            'nullable|string|max:30',


            'mobile'
                =>
            'nullable|string|max:30',


            'email'
                =>
            'nullable|email',



            'tazkira_number'
                =>
            'nullable|string|max:30',


            'tax_number'
                =>
            'nullable|string|max:50',



            'country'
                =>
            'nullable|string|max:100',


            'province'
                =>
            'nullable|string|max:100',


            'district'
                =>
            'nullable|string|max:100',


            'address'
                =>
            'nullable|string',



            'opening_balance'
                =>
            'nullable|numeric',


            'credit_limit'
                =>
            'nullable|numeric',


            'status'
                =>
            'nullable|boolean',


            'note'
                =>
            'nullable|string'

        ]);



        DB::beginTransaction();


        try {


            $validated['created_by'] = Auth::id();


            $account = Account::create($validated);



            LogService::create(

                'create',

                'accounts',

                $account->id,

                'Account created',

                $account->toArray()

            );



            DB::commit();



            return response()->json([

                'message'=>'حساب با موفقیت ایجاد شد',

                'data'=>$account

            ],201);



        } catch(\Exception $e){


            DB::rollBack();


            return response()->json([

                'message'=>'خطا در ایجاد حساب',

                'error'=>$e->getMessage()

            ],500);

        }

    }




    /**
     * نمایش حساب
     */
    public function show($id)
    {

        $account = Account::find($id);


        if(!$account){

            return response()->json([

                'message'=>'حساب یافت نشد'

            ],404);

        }


        return response()->json($account);

    }





    /**
     * ویرایش حساب
     */
    public function update(Request $request,$id)
    {

        $account = Account::find($id);


        if(!$account){

            return response()->json([

                'message'=>'حساب یافت نشد'

            ],404);

        }



        $oldData = $account->toArray();



        $validated = $request->validate([


            'account_code'
                =>
            'sometimes|string|max:30|unique:accounts,account_code,'.$id,


            'account_type'
                =>
            'sometimes|in:Supplier,Customer,Insurance,Company,NGO,Bank,Laboratory,Radiology,Donor,Other',



            'name'
                =>
            'sometimes|string|max:255',


            'contact_person'
                =>
            'nullable|string|max:255',


            'phone'
                =>
            'nullable|string|max:30',


            'mobile'
                =>
            'nullable|string|max:30',


            'email'
                =>
            'nullable|email',


            'tazkira_number'
                =>
            'nullable|string|max:30',


            'tax_number'
                =>
            'nullable|string|max:50',


            'country'
                =>
            'nullable|string',


            'province'
                =>
            'nullable|string',


            'district'
                =>
            'nullable|string',


            'address'
                =>
            'nullable|string',


            'opening_balance'
                =>
            'nullable|numeric',


            'credit_limit'
                =>
            'nullable|numeric',


            'status'
                =>
            'nullable|boolean',


            'note'
                =>
            'nullable|string'

        ]);



        $validated['updated_by'] = Auth::id();



        $account->update($validated);



        LogService::create(

            'update',

            'accounts',

            $account->id,

            'Account updated',

            [

                'old'=>$oldData,

                'new'=>$account->toArray()

            ]

        );



        return response()->json([

            'message'=>'حساب موفقانه ویرایش شد',

            'data'=>$account

        ]);

    }




    /**
     * حذف حساب
     */
    public function destroy($id)
    {

        $account = Account::find($id);


        if(!$account){

            return response()->json([

                'message'=>'حساب یافت نشد'

            ],404);

        }



        $data = $account->toArray();



        $account->delete();



        LogService::create(

            'delete',

            'accounts',

            $id,

            'Account deleted',

            $data

        );



        return response()->json([

            'message'=>'حساب حذف شد'

        ]);

    }


}