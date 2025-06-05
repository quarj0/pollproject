from paystack.api_exceptions.paystack_error import paystackError

class GatewayTimeoutError(paystackError):
    """
    Raised when a gateway response timeout occurs.
    """
    pass
