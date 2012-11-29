package ShockAPI;

use JSON;
use LWP;
use Bio::KBase::AuthToken;

use Data::Dumper;

my $default_url = "http://kbase.us/services/shock-api";
my $package = "ShockAPI";

sub new {
    my ($class, $opts) = @_;

    my $self = {};

    if (defined($opts) && ref($opts) ne 'HASH') {
        usage("Options to " . $package . "->new() must be passed in as a hash.");
    }

    _process_opts($opts, $self);

    $self->{ua} = LWP::UserAgent->new;

    return bless $self, $class;
}

sub create_node {
    my ($self, $opts) = @_;

    # possible options: attribute_file (s), attributes (%), data_file (s), types (s or @), format (s)
    # required: data_file, format, at least one type
    unless (defined($opts->{data_file})) {
        die "Must pass in a data file (data_file) to " . $package . "->create_node";
    }

    unless (-f $opts->{data_file}) {
        die "Not a file: " . $opts->{data_file};
    }

    unless (defined($opts->{format})) {
        die "Must pass in a file format (format) to " . $package . "->create_node";
    }

    my $types;
    if (defined($opts->{type})) {
        $types = [ $opts->{type} ];
    } elsif (defined($opts->{types})) {
        $types = $opts->{types};
        if (scalar @$types == 0) {
            die "Must pass in one or more types (types) to " . $package . "->create_node";
        }
    } else {
        die "Must pass in one or more type (type[s]) to " . $package . "->create_node";
    }

    my $attrs = {};
    if (defined($opts->{attribute_file})) {
        unless (-f $opts->{attribute_file}) {
            die "Not a file: " . $opts->{attribute_file};
        }

        open ATTRS, "<" . $opts->{attribute_file}
          or die "Couldn't open file '" . $opts->{attribute_file} . "': " . $!;
        $attrs = decode_json(<ATTRS>);
        close ATTRS;
    } elsif (defined($opts->{attributes})) {
        $attrs = $opts->{attributes};
    }

    $attrs->{type} = $types->[0];

    # should have everything we need to create a data node
    # note: this loads the entire data file into memory before transmitting...
    # can try '$HTTP::Request::Common::DYNAMIC_FILE_UPLOAD = 1' but probably not supported
    my $res = $self->{ua}->post(
        $self->{url} . "/node",
        [
#            need to wait for new code to be merged
#            'datatype' => 'type1,type2',
#            'format'   => 'fasta',
            'attributes' => [
                undef,
                $opts->{data_file} . ".attributes",
                'Content_Type' => 'application/json',
                'Content' => encode_json($attrs)
            ],
            'upload' => [ $opts->{data_file} ]
        ],
        'Content_Type' => 'form-data'
        # authentication...
    );

    my $result = _process_response($res);
    if ($result->{error}) {
        die "Error with request: " . $result->{message};
    }

    return $result->{data};
}

sub query_nodes {
    my ($self, $opts) = @_;

    
}

sub view_node {
    my ($self, $opts) = @_;

    unless (defined($opts->{node_id})) {
        die "Must pass in a node id (node_id) to " . $package . "->view_node";
    }

    my $res = $self->{ua}->get(
        $self->{url} . "/node/" . $opts->{node_id},
        # authentication...
    );

    my $result = _process_response($res);
    if ($result->{error}) {
        die "Error with request: " . $result->{message};
    }

    return $result->{data};
}

sub download_node {
    my ($self, $opts) = @_;

    unless (defined($opts->{node_id})) {
        die "Must pass in a node id (node_id) to " . $package . "->view_node";
    }

    my $res = $self->{ua}->get(
        $self->{url} . "/node/" . $opts->{node_id} . "?download",
        # authentication...
    );

    my $result = _process_response($res);
    if ($result->{error}) {
        die "Error with request: " . $result->{message};
    }

    return $result->{data};
}

sub _process_response {
    my ($res) = @_;

    if (!$res->is_success) {
        return {
            error => 1,
            message => $res->status_line, ($res->content ? ": " . $res->content : ""), "\n"
        };
    }

    my $content = decode_json($res->content);
    if ($content->{E}) {
        return {
            error => 1,
            message => $content->S, ": ", $content->{E}
        };
    } else {
        return {
            error => 0,
            data => $content->{D}
        };
    }
}

sub _process_opts {
    my ($opts, $self) = @_;

    if ($opts->{user} && $opts->{pass}) {
        my $auth_token = Bio::KBase::AuthToken->new(user_id => $opts->{user},
                                                    password => $opts->{pass});
        if ($auth_token->token()) {
            $self->{auth} = $auth_token;
        } else {
            print STDERR "could not get kbase auth token, reverting to basic auth\n";
            print STDERR $auth_token->error_message();
            print STDERR "will try without authorization\n";
            $self->{auth} = "PUBLIC";
        }
    } else {
        $self->{auth} = "PUBLIC";
    }

    if ($opts->{url}) {
        $self->{url} = $opts->{url};
    } else {
        $self->{url} = $default_url;
    }
}

=head

{
  user => s,
  pass => s,
  attr_file => f or %,
  data_file => f,
  types => @,
  format => s,
  url => s
}


    if ($opts->{attr_file}) {
        if (ref($opts->{attr_file}) eq 'HASH') {
            $self->{attributes} = $opts->{attr_file};
        } else {
            # try to open it as a file
            if (-f $self->{attr_file}) {
                open ATTR, "<" . $self->{attr_file}
                  or die "Couldn't open attr_file '" . $self->{attr_file} . "': " . $!;
                my $attrs = decode_json(<ATTR>);
                close ATTR;
                $self->{attributes} = $attrs;
            } else {
                die usage();
            }
        }
    } else {
        die usage();
    }



=cut

sub usage {
    my ($message) = @_;
    if (defined($message)) {
        print STDERR $message, "\n";
    }

    print "usage...\n";
    exit;
}

1;
