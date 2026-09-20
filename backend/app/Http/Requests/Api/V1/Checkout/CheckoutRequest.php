<?php

namespace App\Http\Requests\Api\V1\Checkout;

use Illuminate\Foundation\Http\FormRequest;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'shipping_address_id' => ['nullable', 'integer', 'exists:addresses,id'],
            'address' => ['nullable', 'array'],
            'address.first_name' => ['nullable', 'string', 'max:80'],
            'address.last_name' => ['nullable', 'string', 'max:80'],
            'address.address_line1' => ['required_without:shipping_address_id', 'string', 'max:255'],
            'address.address_line2' => ['nullable', 'string', 'max:255'],
            'address.city' => ['required_without:shipping_address_id', 'string', 'max:80'],
            'address.state_province' => ['nullable', 'string', 'max:80'],
            'address.postal_code' => ['nullable', 'string', 'max:20'],
            'address.country_code' => ['nullable', 'string', 'size:2'],
            'address.phone' => ['nullable', 'string', 'max:30'],
            'payment_method' => ['nullable', 'in:cod,mobile_money,wave'],
            'mobile_money_phone' => ['nullable', 'required_if:payment_method,mobile_money,wave', 'string', 'max:20'],
            'mobile_money_provider' => ['nullable', 'in:momo,orange'],
            'shipping_approved' => ['nullable', 'boolean'],
            'promo_code' => ['nullable', 'string', 'max:40'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}