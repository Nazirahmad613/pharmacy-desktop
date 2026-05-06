@extends('layout')

@section('content')
<div class="container mt-4">
    <h2 class="text-center text-primary mb-4">لیست داروها</h2>

    @if(session('success'))
        <div class="alert alert-success text-center">
            {{ session('success') }}
            {{ session('up')}}
            {{ session('del')}}
        </div>
    @endif

    <div class="table-responsive">
        <table class="table table-hover table-bordered text-center">
            <thead class="table-dark">
                <tr>
                   
                    <th>نام دوا </th>
                    <th>تعداد مجموعی دوای فروخته شده</th>
                    <th>مجموعه پول  خرید دوا</th>
                    <th>مجموعه پول  بدست آمده از فروش دوا</th>
                    <th>مجموعه سود بدست آمده </th>
                     
                    <th>عملیات</th>
                  
                </tr>
            </thead>
            <tbody>
                @foreach($profit as $prof)
                    <tr>
                        
                     <td>{{ $prof->medication_name}}</td>
                     <td>{{ $prof->total_quantity_sold}}</td> 
                     <td>{{ $prof->total_money_purchased}}</td> 
                    <td>{{ $prof->total_money_sales}}</td>
                    <td>
                        @if($prof->profit_loss == 0)
                        بدون فایده و ضرر ({{ $prof->profit_loss }})
                    @elseif($prof->profit_loss > 0)
                        سود بدست آمده ({{ $prof->profit_loss }})
                    @else
                        نقص بدست آمده ({{ $prof->profit_loss }})
                    @endif
                    </td>
                     
                     
                   
                        <td> 
                            <a href="{{ route('profi_edit', $prof->presc_id) }}" class="btn btn-sm btn-warning">ویرایش</a>

                            <form action="{{ route('prof_destroy',  $prof->presc_id)) }}" method="POST" class="d-inline">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="btn btn-sm btn-danger" onclick="return confirm('آیا مطمئن هستید؟')">حذف</button>
                            </form>
                        </td> 
                    </tr>
                @endforeach
            </tbody>
        </table>  
        <div class="d-flex justify-content-center mt-4">
            {{-- {{ $supp->links('vendor.pagination.bootstrap-5') }} --}}
        </div>
 

    </div>
</div>
    
@endsection

<style>
    body {
        font-family: 'Tahoma', sans-serif;
        background-color: #f8f9fa;
    }

    h2 {
        font-weight: bold;
    }

    .table {
        border-radius: 10px;
        overflow: hidden;
    }

    .table th {
        background: #343a40 !important;
        color: white !important;
    }

    .table tbody tr:nth-child(odd) {
        background: #f2f2f2;
    }

    .table tbody tr:hover {
        background: #d4edda;
        transition: all 0.3s ease-in-out;
    }

    .btn {
        font-weight: bold;
        border-radius: 5px;
    }

    .btn-warning {
        background: #ffbb33;
        border: none;
    }

    .btn-danger {
        background: #dc3545;
        border: none;
    }
</style>

